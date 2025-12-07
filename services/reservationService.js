// services/reservationService.js
// Service to check operating room availability and prevent conflicts

const Surgery = require('../models/Surgery');
const Reservation = require('../models/Reservation');
const mongoose = require('mongoose');

/**
 * Check if an operating room is available for a given time slot
 * @param {ObjectId|String} roomId - Operating room ID
 * @param {Date} startTime - Proposed start time
 * @param {Date} endTime - Proposed end time
 * @param {ObjectId|String} excludeSurgeryId - Optional surgery ID to exclude from check (for updates)
 * @returns {Promise<Object>} - { available: boolean, conflicts: Array }
 */
async function checkRoomAvailability(roomId, startTime, endTime, excludeSurgeryId = null) {
    try {
        // Validate input
        if (!roomId || !startTime || !endTime) {
            return {
                available: false,
                error: 'Paramètres invalides: salle, heure de début et heure de fin requis'
            };
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        // Validate date logic
        if (start >= end) {
            return {
                available: false,
                error: 'L\'heure de début doit être antérieure à l\'heure de fin'
            };
        }

        // Build query to find overlapping surgeries
        const surgeryQuery = {
            operatingRoom: roomId,
            reservationStatus: { $in: ['reserved', 'confirmed'] }, // Only check active reservations
            $or: [
                // Case 1: New reservation starts during an existing one
                {
                    scheduledStartTime: { $lte: start },
                    scheduledEndTime: { $gt: start }
                },
                // Case 2: New reservation ends during an existing one
                {
                    scheduledStartTime: { $lt: end },
                    scheduledEndTime: { $gte: end }
                },
                // Case 3: New reservation completely contains an existing one
                {
                    scheduledStartTime: { $gte: start },
                    scheduledEndTime: { $lte: end }
                }
            ]
        };

        // Exclude current surgery if updating
        if (excludeSurgeryId) {
            surgeryQuery._id = { $ne: excludeSurgeryId };
        }

        // Find conflicting surgeries
        const surgeryConflicts = await Surgery.find(surgeryQuery)
            .populate('surgeon', 'firstName lastName')
            .populate('patient', 'firstName lastName')
            .populate('prestation', 'designation')
            .select('code scheduledStartTime scheduledEndTime reservationStatus surgeon patient prestation')
            .lean();

        // Also check for conflicting reservations
        const reservationQuery = {
            operatingRoom: roomId,
            reservationStatus: { $in: ['pending', 'confirmed'] }, // Active reservations
            $or: [
                {
                    scheduledStartTime: { $lte: start },
                    scheduledEndTime: { $gt: start }
                },
                {
                    scheduledStartTime: { $lt: end },
                    scheduledEndTime: { $gte: end }
                },
                {
                    scheduledStartTime: { $gte: start },
                    scheduledEndTime: { $lte: end }
                }
            ]
        };

        if (excludeSurgeryId) {
            reservationQuery._id = { $ne: excludeSurgeryId };
        }

        const reservationConflicts = await Reservation.find(reservationQuery)
            .populate('surgeon', 'firstName lastName')
            .populate('patient', 'firstName lastName')
            .populate('prestation', 'designation')
            .select('temporaryCode scheduledStartTime scheduledEndTime reservationStatus surgeon patient prestation')
            .lean();

        const allConflicts = [
            ...surgeryConflicts.map(c => ({
                type: 'surgery',
                code: c.code,
                id: c._id,
                surgeon: `Dr. ${c.surgeon.firstName} ${c.surgeon.lastName}`,
                patient: `${c.patient.firstName} ${c.patient.lastName}`,
                prestation: c.prestation.designation,
                startTime: c.scheduledStartTime,
                endTime: c.scheduledEndTime,
                status: c.reservationStatus
            })),
            ...reservationConflicts.map(c => ({
                type: 'reservation',
                code: c.temporaryCode,
                id: c._id,
                surgeon: `Dr. ${c.surgeon.firstName} ${c.surgeon.lastName}`,
                patient: `${c.patient.firstName} ${c.patient.lastName}`,
                prestation: c.prestation.designation,
                startTime: c.scheduledStartTime,
                endTime: c.scheduledEndTime,
                status: c.reservationStatus
            }))
        ];

        if (allConflicts.length > 0) {
            return {
                available: false,
                conflicts: allConflicts
            };
        }

        return {
            available: true,
            conflicts: []
        };

    } catch (error) {
        console.error('Error checking room availability:', error);
        return {
            available: false,
            error: 'Erreur lors de la vérification de disponibilité: ' + error.message
        };
    }
}

/**
 * Get all reservations for a room within a date range
 * @param {ObjectId|String} roomId - Operating room ID
 * @param {Date} startDate - Range start date
 * @param {Date} endDate - Range end date
 * @returns {Promise<Array>} - Array of reservations
 */
async function getRoomReservations(roomId, startDate, endDate) {
    try {
        const reservations = await Surgery.find({
            operatingRoom: roomId,
            scheduledStartTime: { $gte: startDate, $lte: endDate },
            reservationStatus: { $in: ['reserved', 'confirmed', 'completed'] }
        })
        .populate('surgeon', 'firstName lastName')
        .populate('patient', 'firstName lastName')
        .populate('prestation', 'designation')
        .populate('operatingRoom', 'code name')
        .sort({ scheduledStartTime: 1 })
        .lean();

        return reservations;
    } catch (error) {
        console.error('Error getting room reservations:', error);
        throw error;
    }
}

/**
 * Get all reservations across all rooms within a date range
 * @param {Date} startDate - Range start date
 * @param {Date} endDate - Range end date
 * @param {Object} filters - Optional filters (roomId, surgeonId, status)
 * @returns {Promise<Array>} - Array of reservations
 */
async function getAllReservations(startDate, endDate, filters = {}) {
    try {
        const query = {
            scheduledStartTime: { $gte: startDate, $lte: endDate },
            reservationStatus: { $in: ['reserved', 'confirmed', 'completed'] }
        };

        // Apply optional filters
        if (filters.roomId) {
            query.operatingRoom = filters.roomId;
        }
        if (filters.surgeonId) {
            query.surgeon = filters.surgeonId;
        }
        if (filters.status) {
            query.reservationStatus = filters.status;
        }

        const reservations = await Surgery.find(query)
            .populate('surgeon', 'firstName lastName')
            .populate('patient', 'firstName lastName')
            .populate('prestation', 'designation')
            .populate('operatingRoom', 'code name')
            .sort({ scheduledStartTime: 1 })
            .lean();

        return reservations;
    } catch (error) {
        console.error('Error getting all reservations:', error);
        throw error;
    }
}

/**
 * Validate reservation time slot
 * @param {Date} startTime - Proposed start time
 * @param {Date} endTime - Proposed end time
 * @returns {Object} - { valid: boolean, error: string }
 */
function validateReservationTimes(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // Check if start is in the past (allow some grace period - 5 minutes)
    if (start < new Date(now.getTime() - 5 * 60 * 1000)) {
        return {
            valid: false,
            error: 'L\'heure de début ne peut pas être dans le passé'
        };
    }

    // Check if end is before start
    if (end <= start) {
        return {
            valid: false,
            error: 'L\'heure de fin doit être postérieure à l\'heure de début'
        };
    }

    // Check minimum duration (e.g., 15 minutes)
    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < 15) {
        return {
            valid: false,
            error: 'La durée minimale d\'une réservation est de 15 minutes'
        };
    }

    // Check maximum duration (e.g., 12 hours)
    if (durationMinutes > 720) {
        return {
            valid: false,
            error: 'La durée maximale d\'une réservation est de 12 heures'
        };
    }

    return { valid: true };
}

/**
 * Generate hourly slots for a room on a specific date
 * @param {ObjectId|String} roomId - Operating room ID
 * @param {Date} date - Date to generate slots for
 * @param {Number} slotDuration - Duration of each slot in minutes (default: 60)
 * @param {Object} workingHours - { start: 8, end: 18 } (default 8am-6pm)
 * @returns {Promise<Array>} - Array of slot objects with availability status
 */
async function generateSlotsForDay(roomId, date, slotDuration = 60, workingHours = { start: 8, end: 18 }) {
    try {
        const OperatingRoom = require('../models/OperatingRoom');
        
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Get current time to filter out past slots
        const now = new Date();
        const isToday = targetDate.toDateString() === now.toDateString();
        
        // Get room details to check active hours and slot duration
        const room = await OperatingRoom.findById(roomId);
        
        // Use room's slot duration if available, otherwise use parameter
        const finalSlotDuration = (room && room.slotDuration) ? room.slotDuration : slotDuration;
        
        // Determine working hours based on room's active hours
        let finalWorkingHours = workingHours;
        if (room && room.activeHours && room.activeHours.enabled) {
            if (room.activeHours.is24_7) {
                finalWorkingHours = { start: 0, end: 24 };
            } else {
                // Parse time strings (HH:MM format) to hours
                const startTimeParts = room.activeHours.startTime.split(':');
                const endTimeParts = room.activeHours.endTime.split(':');
                finalWorkingHours = {
                    start: parseInt(startTimeParts[0]),
                    end: parseInt(endTimeParts[0]),
                    startMinute: parseInt(startTimeParts[1]) || 0,
                    endMinute: parseInt(endTimeParts[1]) || 0
                };
            }
        }
        
        // Get all surgeries for this room on this date
        const surgeries = await Surgery.find({
            operatingRoom: roomId,
            scheduledStartTime: { $gte: targetDate, $lt: nextDay },
            reservationStatus: { $in: ['reserved', 'confirmed'] }
        })
        .populate('surgeon', 'firstName lastName')
        .populate('patient', 'firstName lastName')
        .populate('prestation', 'designation')
        .select('code scheduledStartTime scheduledEndTime reservationStatus surgeon patient prestation')
        .lean();

        // Get all reservations for this room on this date
        const reservations = await Reservation.find({
            operatingRoom: roomId,
            scheduledStartTime: { $gte: targetDate, $lt: nextDay },
            reservationStatus: { $in: ['pending', 'confirmed'] }
        })
        .populate('surgeon', 'firstName lastName')
        .populate('patient', 'firstName lastName')
        .populate('prestation', 'designation')
        .select('temporaryCode scheduledStartTime scheduledEndTime reservationStatus surgeon patient prestation')
        .lean();

        // Combine both for conflict checking
        const allBookings = [
            ...surgeries.map(s => ({ ...s, type: 'surgery', displayCode: s.code })),
            ...reservations.map(r => ({ ...r, type: 'reservation', displayCode: r.temporaryCode }))
        ];
        
        // Generate slots
        const slots = [];
        
        // Calculate total slots based on working hours
        let totalSlots;
        if (finalWorkingHours.start === 0 && finalWorkingHours.end === 24) {
            // 24/7 mode - generate slots for full day
            totalSlots = Math.floor(24 * 60 / finalSlotDuration);
        } else {
            // Regular mode - calculate from start to end time
            const startMinutes = (finalWorkingHours.startMinute || 0);
            const endMinutes = (finalWorkingHours.endMinute || 0);
            const durationMinutes = (finalWorkingHours.end - finalWorkingHours.start) * 60 + (endMinutes - startMinutes);
            totalSlots = Math.floor(durationMinutes / finalSlotDuration);
        }
        
        // Calculate the starting slot index for today
        let startSlotIndex = 0;
        if (isToday) {
            // Find the first slot that starts after the current time
            // If current time is 14:15 with 30-min slots, we want to start from 14:30
            // If current time is 14:15 with 60-min slots, we want to start from 15:00
            
            for (let testI = 0; testI < totalSlots; testI++) {
                const testSlotStart = new Date(targetDate);
                
                if (finalWorkingHours.start === 0 && finalWorkingHours.end === 24) {
                    testSlotStart.setHours(0);
                    testSlotStart.setMinutes(testI * finalSlotDuration);
                } else {
                    testSlotStart.setHours(finalWorkingHours.start);
                    testSlotStart.setMinutes((finalWorkingHours.startMinute || 0) + testI * finalSlotDuration);
                }
                
                // Start from the first slot that begins after current time
                if (testSlotStart > now) {
                    startSlotIndex = testI;
                    break;
                }
            }
        }
        
        for (let i = startSlotIndex; i < totalSlots; i++) {
            const slotStart = new Date(targetDate);
            
            if (finalWorkingHours.start === 0 && finalWorkingHours.end === 24) {
                // 24/7 mode
                slotStart.setHours(0);
                slotStart.setMinutes(i * finalSlotDuration);
            } else {
                // Regular mode
                slotStart.setHours(finalWorkingHours.start);
                slotStart.setMinutes((finalWorkingHours.startMinute || 0) + i * finalSlotDuration);
            }
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + finalSlotDuration);
            
            // Check if this slot overlaps with any booking
            const conflict = allBookings.find(booking => {
                const bookingStart = new Date(booking.scheduledStartTime);
                const bookingEnd = new Date(booking.scheduledEndTime);
                
                // Check for overlap
                return (slotStart < bookingEnd && slotEnd > bookingStart);
            });
            
            const slot = {
                start: slotStart,
                end: slotEnd,
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                hour: slotStart.getHours(),
                minute: slotStart.getMinutes(),
                label: `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')} - ${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`,
                status: conflict ? 'taken' : 'free'
            };
            
            if (conflict) {
                slot.booking = {
                    type: conflict.type,
                    code: conflict.displayCode,
                    code: conflict.code,
                    id: conflict._id,
                    surgeon: `Dr. ${conflict.surgeon.firstName} ${conflict.surgeon.lastName}`,
                    patient: `${conflict.patient.firstName} ${conflict.patient.lastName}`,
                    prestation: conflict.prestation.designation,
                    status: conflict.reservationStatus
                };
            }
            
            slots.push(slot);
        }
        
        return slots;
    } catch (error) {
        console.error('Error generating slots:', error);
        throw error;
    }
}

/**
 * Validate that selected slots are contiguous
 * @param {Array} slotIndices - Array of slot indices
 * @returns {Boolean} - True if contiguous
 */
function validateContiguousSlots(slotIndices) {
    if (!slotIndices || slotIndices.length === 0) return false;
    if (slotIndices.length === 1) return true;
    
    const sorted = [...slotIndices].sort((a, b) => a - b);
    
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
            return false;
        }
    }
    
    return true;
}

module.exports = {
    checkRoomAvailability,
    getRoomReservations,
    getAllReservations,
    validateReservationTimes,
    generateSlotsForDay,
    validateContiguousSlots
};
