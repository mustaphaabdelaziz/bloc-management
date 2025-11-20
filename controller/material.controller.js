const Material = require("../models/Material");
const Specialty = require("../models/Specialty");
const Surgery = require("../models/Surgery");
// Liste des matériaux
module.exports.materialList = async (req, res) => {
  try {
    const category = req.query.category || "";
    const search = req.query.search || "";

    let query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { designation: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const materials = await Material.find(query)
      .populate("specialty")
      .sort({ designation: 1 });

    // Check if user can view pricing (headDepart cannot see pricing)
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canViewPricing = userPrivileges.includes('admin') || userPrivileges.includes('direction') || userPrivileges.includes('buyer');

    // Filter out pricing for headDepart and assistante users
    const filteredMaterials = canViewPricing ? materials : materials.map(m => ({
      ...m.toObject(),
      priceHT: undefined,
      weightedPrice: undefined
    }));

    res.render("materials/index", {
      title: "Gestion des Matériaux",
      materials: filteredMaterials,
      filters: { category, search },
      canViewPricing,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Nouveau matériau
module.exports.renderCreateMateirialForm = async (req, res) => {
  try {
    console.log("Rendering new material form");
    const specialties = await Specialty.find().sort({ name: 1 });
    console.log("Specialties:", specialties);
    res.render("materials/new", {
      title: "Nouveau Matériau",
      material: {},
      specialties,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.createMaterial = async (req, res) => {
  try {
    console.log('Creating material with data:', req.body);

    // Remove code from req.body since it will be auto-generated
    const materialData = { ...req.body };
    delete materialData.code;

    // Handle specialty field - can be array or single value
    console.log('Specialty field value:', materialData.specialty, 'Type:', typeof materialData.specialty, 'Length:', materialData.specialty ? materialData.specialty.length : 'N/A');

    if (materialData.specialty === '' || materialData.specialty === null || materialData.specialty === undefined) {
      console.log('Setting specialty to undefined');
      materialData.specialty = undefined;
    } else if (Array.isArray(materialData.specialty)) {
      // Filter out empty strings from array
      materialData.specialty = materialData.specialty.filter(s => s !== '' && s !== null && s !== undefined);
      if (materialData.specialty.length === 0) {
        materialData.specialty = undefined;
      }
      console.log('Filtered specialty array:', materialData.specialty);
    } else if (typeof materialData.specialty === 'string' && materialData.specialty.trim() === '') {
      materialData.specialty = undefined;
    }

    console.log('Material data after processing:', materialData);

    const material = new Material(materialData);
    console.log('Material instance created:', material);

    await material.save();
    console.log('Material saved successfully');

    res.redirect("/materials?success=Matériau créé avec succès");
  } catch (error) {
    console.error('Error creating material:', error);
    console.error('Error stack:', error.stack);

    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("materials/new", {
      title: "Nouveau Matériau",
      material: req.body,
      specialties,
      error: `Erreur lors de la création: ${error.message}`,
    });
  }
};
// Ajouter arrivage
module.exports.createMaterialArrival = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }

    const arrival = {
      date: new Date(req.body.date),
      quantity: parseInt(req.body.quantity),
      unitPrice: parseFloat(req.body.unitPrice),
      purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : undefined
    };

    // Calculate old weighted price (use existing stockValue/stock or fallback to priceHT)
    const oldWeightedPrice = material.stock > 0 && material.stockValue > 0 
      ? material.stockValue / material.stock 
      : material.priceHT;

    // Update stock value using perpetual weighted average method:
    // New stock value = (old stock × old weighted price) + (new quantity × new unit price)
    material.stockValue = (material.stock * oldWeightedPrice) + (arrival.quantity * arrival.unitPrice);
    
    material.arrivals.push(arrival);
    material.stock += arrival.quantity;

    // Auto-create unit templates for patient-type materials
    if (material.category === 'patient') {
      const newArrival = material.arrivals[material.arrivals.length - 1];
      const arrivalId = newArrival._id;
      
      for (let i = 0; i < arrival.quantity; i++) {
        material.units.push({
          arrivalId: arrivalId,
          serialNumber: `TEMP-${String(i + 1).padStart(3, '0')}`,
          barcode: null,
          purchaseDate: arrival.purchaseDate || arrival.date,
          expirationDate: null,
          unitPrice: arrival.unitPrice,
          status: 'in_stock',
          notes: 'À compléter',
          createdAt: new Date()
        });
      }
    }

    await material.save();

    res.redirect(`/materials/${req.params.id}?success=Arrivage ajouté`);
  } catch (error) {
    res.redirect(`/materials/${req.params.id}?error=Erreur lors de l'ajout`);
  }
};

// Modifier un arrivage
module.exports.updateMaterialArrival = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }

    const arrivalIndex = parseInt(req.params.arrivalIndex);
    if (arrivalIndex < 0 || arrivalIndex >= material.arrivals.length) {
      return res.redirect(`/materials/${req.params.id}?error=Arrivage introuvable`);
    }

    const oldArrival = material.arrivals[arrivalIndex];
    const oldQuantity = oldArrival.quantity;
    const oldUnitPrice = oldArrival.unitPrice;

    // New values from form
    const newQuantity = parseFloat(req.body.quantity);
    const newUnitPrice = parseFloat(req.body.unitPrice);
    const newDate = new Date(req.body.date);

    // Calculate the difference in quantity and value
    const quantityDiff = newQuantity - oldQuantity;
    const oldValue = oldQuantity * oldUnitPrice;
    const newValue = newQuantity * newUnitPrice;
    const valueDiff = newValue - oldValue;

    // Update the arrival record
    material.arrivals[arrivalIndex] = {
      date: newDate,
      quantity: newQuantity,
      unitPrice: newUnitPrice,
      purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : undefined
    };

    // Update stock quantity
    material.stock += quantityDiff;
    
    // Update stock value
    material.stockValue = Math.max(0, material.stockValue + valueDiff);

    await material.save();

    res.redirect(`/materials/${req.params.id}?success=Arrivage modifié avec succès`);
  } catch (error) {
    console.error('Error updating arrival:', error);
    res.redirect(`/materials/${req.params.id}?error=Erreur lors de la modification`);
  }
};

// Supprimer un arrivage
module.exports.deleteMaterialArrival = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }

    const arrivalIndex = parseInt(req.params.arrivalIndex);
    if (arrivalIndex < 0 || arrivalIndex >= material.arrivals.length) {
      return res.redirect(`/materials/${req.params.id}?error=Arrivage introuvable`);
    }

    const arrival = material.arrivals[arrivalIndex];
    const arrivalQuantity = arrival.quantity;
    const arrivalValue = arrival.quantity * arrival.unitPrice;

    // Remove the arrival from array
    material.arrivals.splice(arrivalIndex, 1);

    // Update stock quantity
    material.stock = Math.max(0, material.stock - arrivalQuantity);
    
    // Update stock value
    material.stockValue = Math.max(0, material.stockValue - arrivalValue);

    await material.save();

    res.redirect(`/materials/${req.params.id}?success=Arrivage supprimé avec succès`);
  } catch (error) {
    console.error('Error deleting arrival:', error);
    res.redirect(`/materials/${req.params.id}?error=Erreur lors de la suppression`);
  }
};

module.exports.renderEditMaterialForm = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }
    const specialties = await Specialty.find().sort({ name: 1 });
    res.render("materials/edit", {
      title: "Modifier Matériau",
      material,
      specialties,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};
module.exports.updateMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }
    
    // Remove code from update data since it should not be changed
    const updateData = { ...req.body };
    delete updateData.code;

    // Handle empty specialty field
    if (updateData.specialty === '') {
      updateData.specialty = undefined;
    }
    
    Object.assign(material, updateData);
    await material.save();
    res.redirect(`/materials?success=Matériau modifié`);
  } catch (error) {
    res.redirect(`/materials?error=Erreur lors de la modification`);
  }
};
module.exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }
    res.redirect("/materials?success=Matériau supprimé");
  } catch (error) {
    res.redirect("/materials?error=Erreur lors de la suppression");
  }
};
module.exports.showMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).populate("specialty");
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }

    // Check if user can view pricing
    const userPrivileges = req.user && req.user.privileges ? req.user.privileges : [];
    const canViewPricing = userPrivileges.includes('admin') || userPrivileges.includes('direction');

    // Calculate consumption statistics
    const surgeries = await Surgery.find({
      "consumedMaterials.material": req.params.id
    }).populate("surgeon patient prestation");

    let totalConsumed = 0;
    let totalUsageValue = 0;
    let surgeryCount = 0;

    surgeries.forEach(surgery => {
      const consumedItem = surgery.consumedMaterials.find(
        cm => cm.material && cm.material._id.toString() === req.params.id
      );
      if (consumedItem) {
        totalConsumed += consumedItem.quantity;
        totalUsageValue += consumedItem.quantity * (consumedItem.priceUsed || 0);
        surgeryCount += 1;
      }
    });

    res.render("materials/show", {
      title: "Détails du Matériau",
      material,
      canViewPricing,
      surgeries,
      totalConsumed,
      totalUsageValue,
      surgeryCount,
    });
  } catch (error) {
    res.status(500).render("error", { title: "Erreur", error });
  }
};

// Add unit (serial number, barcode) for patient-type materials
module.exports.addUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { serialNumber, barcode, purchaseDate, expirationDate, unitPrice, batch, notes, arrivalId } = req.body;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    // Validate arrivalId if provided
    if (arrivalId) {
      const arrivalExists = material.arrivals.some(a => a._id.toString() === arrivalId);
      if (!arrivalExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid arrival ID' 
        });
      }
    }

    // Validate serial number uniqueness within material
    if (material.units && material.units.some(u => u.serialNumber === serialNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: `Serial number ${serialNumber} already exists for this material` 
      });
    }

    // Auto-generate barcode if not provided
    const finalBarcode = barcode || `${material.code}-${serialNumber}`;

    // Validate barcode uniqueness if provided
    if (barcode) {
      const existingUnit = await Material.findOne({ 'units.barcode': barcode, _id: { $ne: id } });
      if (existingUnit) {
        return res.status(400).json({ 
          success: false, 
          message: `Barcode ${barcode} already exists` 
        });
      }
    }

    const newUnit = {
      arrivalId: arrivalId || null,
      serialNumber,
      barcode: finalBarcode,
      purchaseDate: new Date(purchaseDate),
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      unitPrice: parseFloat(unitPrice),
      batch: batch || null,
      notes: notes || null,
      status: 'in_stock',
      createdAt: new Date()
    };

    if (!material.units) {
      material.units = [];
    }

    material.units.push(newUnit);
    await material.save();

    res.json({ 
      success: true, 
      message: 'Unit added successfully',
      unit: material.units[material.units.length - 1]
    });
  } catch (error) {
    console.error('Error adding unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get units list
module.exports.getUnits = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, search } = req.query;

    const material = await Material.findById(id).populate('units.usedInSurgery').populate('units.patient');
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    let units = material.units || [];

    // Filter by status
    if (status && status !== 'all') {
      units = units.filter(u => u.status === status);
    }

    // Search by serial number or barcode
    if (search) {
      units = units.filter(u => 
        u.serialNumber.includes(search) || 
        (u.barcode && u.barcode.includes(search))
      );
    }

    res.json({ 
      success: true, 
      units: units.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    });
  } catch (error) {
    console.error('Error getting units:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get units for a specific arrival
module.exports.getArrivalUnits = async (req, res) => {
  try {
    const { id, arrivalId } = req.params;
    const { search, status } = req.query;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    // Validate arrival exists
    const arrival = material.arrivals.find(a => a._id.toString() === arrivalId);
    if (!arrival) {
      return res.status(404).json({ success: false, message: 'Arrival not found' });
    }

    // Filter units by arrivalId
    let units = material.units ? material.units.filter(u => 
      u.arrivalId && u.arrivalId.toString() === arrivalId
    ) : [];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      units = units.filter(u => 
        u.serialNumber.toLowerCase().includes(searchLower) ||
        (u.barcode && u.barcode.toLowerCase().includes(searchLower)) ||
        (u.batch && u.batch.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (status && status !== 'all') {
      units = units.filter(u => u.status === status);
    }

    res.json({ 
      success: true, 
      units: units.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      arrival,
      material: {
        _id: material._id,
        code: material.code,
        designation: material.designation
      }
    });
  } catch (error) {
    console.error('Error fetching arrival units:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update unit status
module.exports.updateUnitStatus = async (req, res) => {
  try {
    const { id, unitId } = req.params;
    const { status, notes } = req.body;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const unit = material.units.id(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    unit.status = status;
    if (notes) {
      unit.notes = notes;
    }

    await material.save();

    res.json({ 
      success: true, 
      message: 'Unit updated successfully',
      unit 
    });
  } catch (error) {
    console.error('Error updating unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update unit details (serial number, barcode, dates, price)
module.exports.updateUnit = async (req, res) => {
  try {
    const { id, unitId } = req.params;
    const { serialNumber, barcode, purchaseDate, expirationDate, unitPrice, notes } = req.body;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const unit = material.units.id(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    // Validate serial number if changed and not empty
    if (serialNumber && serialNumber.trim() !== '') {
      // Check uniqueness only if serial number changed
      if (serialNumber !== unit.serialNumber) {
        const duplicateUnit = material.units.find(u => 
          u._id.toString() !== unitId && u.serialNumber === serialNumber
        );
        if (duplicateUnit) {
          return res.status(400).json({ 
            success: false, 
            message: `Serial number ${serialNumber} already exists for this material` 
          });
        }
      }
      unit.serialNumber = serialNumber;
    }

    // Update other fields
    if (barcode !== undefined) {
      unit.barcode = barcode || null;
    }
    if (purchaseDate) {
      unit.purchaseDate = new Date(purchaseDate);
    }
    if (expirationDate !== undefined) {
      unit.expirationDate = expirationDate ? new Date(expirationDate) : null;
    }
    if (unitPrice !== undefined) {
      unit.unitPrice = parseFloat(unitPrice);
    }
    if (notes !== undefined) {
      unit.notes = notes || null;
    }

    await material.save();

    res.json({ 
      success: true, 
      message: 'Unit updated successfully',
      unit 
    });
  } catch (error) {
    console.error('Error updating unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark unit as used in surgery
module.exports.markUnitUsed = async (req, res) => {
  try {
    const { id, unitId } = req.params;
    const { surgeryId, patientId } = req.body;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const unit = material.units.id(unitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    unit.status = 'used';
    unit.usedInSurgery = surgeryId;
    unit.patient = patientId;

    await material.save();

    res.json({ 
      success: true, 
      message: 'Unit marked as used',
      unit 
    });
  } catch (error) {
    console.error('Error marking unit as used:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete unit
module.exports.deleteUnit = async (req, res) => {
  try {
    const { id, unitId } = req.params;

    const material = await Material.findById(id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    material.units.id(unitId).remove();
    await material.save();

    res.json({ 
      success: true, 
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};




