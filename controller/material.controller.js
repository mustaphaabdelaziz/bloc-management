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
      .populate('createdBy', 'firstname lastname')
      .populate('updatedBy', 'firstname lastname')
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
    res.status(500).render("errorHandling/error", { statusCode: "500", err: error });
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
    res.status(500).render("errorHandling/error", { statusCode: "500", err: error });
  }
};
module.exports.createMaterial = async (req, res) => {
  try {
    console.log('Creating material with data:', req.body);

    // Remove code from req.body since it will be auto-generated
    const materialData = { ...req.body };
    delete materialData.code;
    
    // Handle reference field - trim whitespace and allow empty
    if (materialData.reference) {
      materialData.reference = materialData.reference.trim() || undefined;
    }

    // Handle specialty field - can be array or single value
    // Check if 'all' option was selected (applies to all specialties)
    console.log('Specialty field value:', materialData.specialty, 'Type:', typeof materialData.specialty, 'Length:', materialData.specialty ? materialData.specialty.length : 'N/A');

    const hasAllOption = Array.isArray(materialData.specialty) 
      ? materialData.specialty.includes('all')
      : materialData.specialty === 'all';
    
    if (hasAllOption) {
      // Material applies to all specialties
      materialData.appliesToAllSpecialties = true;
      materialData.specialty = undefined;
      console.log('Material applies to all specialties');
    } else if (materialData.specialty === '' || materialData.specialty === null || materialData.specialty === undefined) {
      console.log('Setting specialty to undefined');
      materialData.specialty = undefined;
      materialData.appliesToAllSpecialties = false;
    } else if (Array.isArray(materialData.specialty)) {
      // Filter out empty strings from array
      materialData.specialty = materialData.specialty.filter(s => s !== '' && s !== null && s !== undefined && s !== 'all');
      if (materialData.specialty.length === 0) {
        materialData.specialty = undefined;
      }
      materialData.appliesToAllSpecialties = false;
      console.log('Filtered specialty array:', materialData.specialty);
    } else if (typeof materialData.specialty === 'string' && materialData.specialty.trim() === '') {
      materialData.specialty = undefined;
      materialData.appliesToAllSpecialties = false;
    } else {
      materialData.appliesToAllSpecialties = false;
    }

    console.log('Material data after processing:', materialData);

    const material = new Material(materialData);
    material.createdBy = req.user._id;
    material.updatedBy = req.user._id;
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
// Ajouter arrivage (legacy) or purchase record
module.exports.createMaterialArrival = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Matériau non trouvé" });
    }

    // New purchase system: add to purchases array
    // Quantity defaults to 1 if not provided (user no longer required to enter it)
    const purchase = {
      date: new Date(req.body.date),
      priceHT: parseFloat(req.body.unitPrice),
      quantity: req.body.quantity ? parseFloat(req.body.quantity) : 1,
      supplier: req.body.supplier || undefined,
      invoiceRef: req.body.invoiceRef || undefined,
      notes: req.body.notes || undefined
    };

    if (!material.purchases) {
      material.purchases = [];
    }
    material.purchases.push(purchase);

    // Also add to legacy arrivals for backward compatibility
    const arrival = {
      date: new Date(req.body.date),
      quantity: req.body.quantity ? parseFloat(req.body.quantity) : 1,
      unitPrice: parseFloat(req.body.unitPrice),
      purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : undefined
    };
    material.arrivals.push(arrival);

    // Update stock quantity for legacy compatibility (informational)
    if (req.body.quantity) {
      material.stock += parseInt(req.body.quantity);
      
      // Update stock value for legacy weighted price calculation
      const oldWeightedPrice = material.stock > parseInt(req.body.quantity) && material.stockValue > 0 
        ? material.stockValue / (material.stock - parseInt(req.body.quantity))
        : material.priceHT;
      material.stockValue = ((material.stock - parseInt(req.body.quantity)) * oldWeightedPrice) + (parseInt(req.body.quantity) * parseFloat(req.body.unitPrice));
    }

    // Auto-create unit templates for patient-type materials (legacy behavior)
    if (material.category === 'patient' && req.body.quantity) {
      const newArrival = material.arrivals[material.arrivals.length - 1];
      const arrivalId = newArrival._id;
      
      for (let i = 0; i < parseInt(req.body.quantity); i++) {
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

    res.redirect(`/materials/${req.params.id}?success=Achat enregistré`);
  } catch (error) {
    res.redirect(`/materials/${req.params.id}?error=Erreur lors de l'ajout`);
  }
};

// Add a new purchase record (API endpoint)
module.exports.addPurchase = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Matériau non trouvé" });
    }

    const purchase = {
      date: new Date(req.body.date || Date.now()),
      priceHT: parseFloat(req.body.priceHT),
      quantity: req.body.quantity ? parseFloat(req.body.quantity) : 1,
      supplier: req.body.supplier || undefined,
      invoiceRef: req.body.invoiceRef || undefined,
      notes: req.body.notes || undefined
    };

    if (!material.purchases) {
      material.purchases = [];
    }
    material.purchases.push(purchase);

    await material.save();

    res.json({ 
      success: true, 
      message: 'Achat enregistré',
      purchase: material.purchases[material.purchases.length - 1],
      newAveragePrice: material.weightedPrice,
      newSellingPrice: material.sellingPriceHT
    });
  } catch (error) {
    console.error('Error adding purchase:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update material selling markup and price mode
module.exports.updatePricing = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Matériau non trouvé" });
    }

    if (req.body.sellingMarkupPercent !== undefined) {
      material.sellingMarkupPercent = parseFloat(req.body.sellingMarkupPercent);
    }
    if (req.body.priceMode) {
      material.priceMode = req.body.priceMode;
    }
    if (req.body.priceHT !== undefined) {
      material.priceHT = parseFloat(req.body.priceHT);
    }

    await material.save();

    res.json({ 
      success: true, 
      message: 'Tarification mise à jour',
      effectivePurchasePrice: material.effectivePurchasePrice,
      sellingPriceHT: material.sellingPriceHT
    });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).render("errorHandling/error", { statusCode: "500", err: error });
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
    
    // Handle reference field - trim whitespace and allow empty
    if (updateData.reference !== undefined) {
      updateData.reference = updateData.reference.trim() || undefined;
    }

    // Convert numeric fields to proper numbers
    if (updateData.priceHT) {
      updateData.priceHT = parseFloat(updateData.priceHT);
      if (isNaN(updateData.priceHT) || updateData.priceHT < 0) {
        return res.redirect(`/materials?error=Prix d'achat invalide`);
      }
    }

    if (updateData.tva) {
      updateData.tva = parseFloat(updateData.tva);
      if (isNaN(updateData.tva) || updateData.tva < 0) {
        return res.redirect(`/materials?error=TVA invalide`);
      }
    }

    if (updateData.sellingMarkupPercent) {
      updateData.sellingMarkupPercent = parseFloat(updateData.sellingMarkupPercent);
      if (isNaN(updateData.sellingMarkupPercent) || updateData.sellingMarkupPercent < 0) {
        return res.redirect(`/materials?error=Marge de vente invalide`);
      }
    }

    // Handle specialty field - check for 'all' option
    const hasAllOption = Array.isArray(updateData.specialty) 
      ? updateData.specialty.includes('all')
      : updateData.specialty === 'all';
    
    if (hasAllOption) {
      updateData.appliesToAllSpecialties = true;
      updateData.specialty = undefined;
    } else if (updateData.specialty === '' || updateData.specialty === undefined) {
      updateData.specialty = undefined;
      updateData.appliesToAllSpecialties = false;
    } else if (Array.isArray(updateData.specialty)) {
      updateData.specialty = updateData.specialty.filter(s => s !== '' && s !== null && s !== 'all');
      if (updateData.specialty.length === 0) {
        updateData.specialty = undefined;
      }
      updateData.appliesToAllSpecialties = false;
    } else {
      updateData.appliesToAllSpecialties = false;
    }
    
    updateData.updatedBy = req.user._id;
    Object.assign(material, updateData);
    await material.save();
    res.redirect(`/materials?success=Matériau modifié`);
  } catch (error) {
    console.error("Erreur update matériau:", error);
    res.redirect(`/materials?error=Erreur lors de la modification: ${error.message}`);
  }
};
module.exports.deleteMaterial = async (req, res) => {
  try {
    const materialId = req.params.id;

    // Check if material is used in any surgery
    const surgeriesCount = await Surgery.countDocuments({
      "consumedMaterials.material": materialId,
    });

    if (surgeriesCount > 0) {
      return res.redirect(
        `/materials?error=Ce matériel ne peut pas être supprimé car il est utilisé dans ${surgeriesCount} chirurgie(s)`
      );
    }

    const material = await Material.findByIdAndDelete(materialId);
    if (!material) {
      return res.redirect("/materials?error=Matériel non trouvé");
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

    // Calculate consumption statistics from surgeries
    const surgeries = await Surgery.find({
      "consumedMaterials.material": req.params.id
    }).populate("surgeon patient prestation");

    let totalConsumed = 0;
    let totalUsageValue = 0;
    let surgeryCount = 0;
    
    // Monthly usage stats for charts
    const monthlyUsage = {};
    // Surgeon usage stats
    const surgeonUsage = {};
    // Prestation usage stats
    const prestationUsage = {};

    surgeries.forEach(surgery => {
      const consumedItem = surgery.consumedMaterials.find(
        cm => cm.material && cm.material._id.toString() === req.params.id
      );
      if (consumedItem) {
        totalConsumed += consumedItem.quantity;
        totalUsageValue += consumedItem.quantity * (consumedItem.priceUsed || 0);
        surgeryCount += 1;

        // Monthly tracking
        const monthKey = surgery.incisionTime 
          ? new Date(surgery.incisionTime).toISOString().slice(0, 7) 
          : 'unknown';
        if (!monthlyUsage[monthKey]) {
          monthlyUsage[monthKey] = { count: 0, quantity: 0, value: 0 };
        }
        monthlyUsage[monthKey].count += 1;
        monthlyUsage[monthKey].quantity += consumedItem.quantity;
        monthlyUsage[monthKey].value += consumedItem.quantity * (consumedItem.priceUsed || 0);

        // Surgeon tracking
        if (surgery.surgeon) {
          const surgeonKey = surgery.surgeon._id.toString();
          const surgeonName = `${surgery.surgeon.lastName || ''} ${surgery.surgeon.firstName || ''}`.trim();
          if (!surgeonUsage[surgeonKey]) {
            surgeonUsage[surgeonKey] = { name: surgeonName, count: 0, quantity: 0, value: 0 };
          }
          surgeonUsage[surgeonKey].count += 1;
          surgeonUsage[surgeonKey].quantity += consumedItem.quantity;
          surgeonUsage[surgeonKey].value += consumedItem.quantity * (consumedItem.priceUsed || 0);
        }

        // Prestation tracking
        if (surgery.prestation) {
          const prestationKey = surgery.prestation._id.toString();
          const prestationName = surgery.prestation.designation || 'Unknown';
          if (!prestationUsage[prestationKey]) {
            prestationUsage[prestationKey] = { name: prestationName, count: 0, quantity: 0, value: 0 };
          }
          prestationUsage[prestationKey].count += 1;
          prestationUsage[prestationKey].quantity += consumedItem.quantity;
          prestationUsage[prestationKey].value += consumedItem.quantity * (consumedItem.priceUsed || 0);
        }
      }
    });

    // Convert to sorted arrays
    const monthlyStats = Object.entries(monthlyUsage)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    const surgeonStats = Object.values(surgeonUsage)
      .sort((a, b) => b.quantity - a.quantity);
    
    const prestationStats = Object.values(prestationUsage)
      .sort((a, b) => b.quantity - a.quantity);

    // Calculate average usage per surgery
    const avgUsagePerSurgery = surgeryCount > 0 ? totalConsumed / surgeryCount : 0;

    res.render("materials/show", {
      title: "Détails du Matériau",
      material,
      canViewPricing,
      surgeries,
      totalConsumed,
      totalUsageValue,
      surgeryCount,
      avgUsagePerSurgery,
      monthlyStats,
      surgeonStats,
      prestationStats,
    });
  } catch (error) {
    res.status(500).render("errorHandling/error", { statusCode: "500", err: error });
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

// Download Excel template for materials import
module.exports.downloadMaterialTemplate = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Create sample data with headers
    const worksheetData = [
      // Header row
      ['Désignation', 'Référence', 'Prix d\'Achat HT', 'TVA', 'Catégorie', 'Unité de Mesure', 'Marge de Vente (%)', 'Marque', 'Spécialité'],

      // Sample rows with realistic data
      ['Fil de suture 3/0', 'ETH-3-0-2024', '150.00', '0.19', 'consumable', 'boîte (Bt)', '20', 'Ethicon', 'Cardiologie'],
      ['Plaque d\'ostéosynthèse', 'SYN-PLAQUE-42', '2500.00', '0.19', 'patient', 'pièce (Pce)', '15', 'Synthes', 'Orthopédie'],
      ['Compresses stériles', 'HAR-COMP-1000', '45.00', '0.19', 'consumable', 'paquet (Paq)', '25', 'Hartmann', 'Toutes les spécialités'],
      ['Clip vasculaire', 'AESC-CLIP-VAS', '320.00', '0.19', 'patient', 'pièce (Pce)', '10', 'Aesculap', 'Neurochirurgie'],
      ['Spéculum vaginal', 'MED-SPEC-VAG', '85.00', '0.19', 'consumable', 'pièce (Pce)', '30', 'Medline', 'Gynécologie']
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 25 },  // Désignation
      { wch: 15 },  // Référence
      { wch: 15 },  // Prix d'Achat HT
      { wch: 8 },   // TVA
      { wch: 12 },  // Catégorie
      { wch: 15 },  // Unité de Mesure
      { wch: 15 },  // Marge de Vente (%)
      { wch: 15 },  // Marque
      { wch: 20 }   // Spécialité
    ];

    // Add notes/instructions sheet
    const notesData = [
      ['INSTRUCTIONS POUR L\'IMPORT DES MATÉRIAUX'],
      [''],
      ['COLONNES OBLIGATOIRES:'],
      ['Désignation', 'Nom complet du matériau'],
      ['Prix d\'Achat HT', 'Prix d\'achat hors taxes (format: 123.45)'],
      ['TVA', 'Taux de TVA (0.0, 0.09, 0.19)'],
      ['Catégorie', 'consumable (jetable) ou patient (implant)'],
      ['Unité de Mesure', 'pièce (Pce), boîte (Bt), paquet (Paq), etc.'],
      [''],
      ['COLONNES OPTIONNELLES:'],
      ['Référence', 'Numéro de référence ou code du fabricant'],
      ['Marge de Vente (%)', 'Pourcentage de marge (défaut: 0)'],
      ['Marque', 'Nom du fabricant'],
      ['Spécialité', 'Nom de la spécialité ou "Toutes les spécialités"'],
      [''],
      ['REMARQUES IMPORTANTES:'],
      ['- Le code sera généré automatiquement au format MAT-{SPECIALITE}-XXX'],
      ['- N\'incluez pas de colonne "Code" dans votre fichier'],
      ['- Prix doit être un nombre positif'],
      ['- TVA: 0.0 (exonéré), 0.09 (9%), 0.19 (19%)'],
      ['- Catégorie: "consumable" ou "patient" uniquement'],
      ['- Taille maximale du fichier: 10 MB'],
      ['- Les lignes vides seront ignorées'],
      [''],
      ['EXEMPLE D\'UTILISATION:'],
      ['- Téléchargez ce modèle'],
      ['- Remplissez avec vos données'],
      ['- Importez via le bouton "Importer Excel"'],
      ['- Vérifiez les résultats d\'import']
    ];

    const wsNotes = XLSX.utils.aoa_to_sheet(notesData);
    wsNotes['!cols'] = [{ wch: 40 }, { wch: 60 }];

    // Create workbook and add both sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matériaux');
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Modele_Import_Materiaux.xlsx"');
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);

  } catch (error) {
    console.error("Error generating material template:", error);
    res.redirect('/materials?error=' + encodeURIComponent('Erreur lors de la génération du modèle Excel'));
  }
};

// Import materials from Excel
module.exports.importMaterials = async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect("/materials?error=Aucun fichier uploadé");
    }

    const XLSX = require('xlsx');
    const Specialty = require("../models/Specialty");

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!data || data.length === 0) {
      return res.redirect("/materials?error=Le fichier Excel est vide");
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because Excel is 1-indexed and first row is header

      try {
        // Normalize column names (case-insensitive)
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[key.toLowerCase().trim()] = row[key];
        });

        // Extract fields with flexible column names
        const designation = normalizedRow['désignation'] || normalizedRow['designation'] || '';
        const reference = normalizedRow['référence'] || normalizedRow['reference'] || '';
        const priceHT = normalizedRow['prix d\'achat ht'] || normalizedRow['prix dachat ht'] || normalizedRow['prix ht'] || '';
        const tva = normalizedRow['tva'] || '';
        const category = normalizedRow['catégorie'] || normalizedRow['category'] || '';
        const unitOfMeasure = normalizedRow['unité de mesure'] || normalizedRow['unite de mesure'] || normalizedRow['unité'] || '';
        const sellingMarkupPercent = normalizedRow['marge de vente (%)'] || normalizedRow['marge'] || '';
        const brand = normalizedRow['marque'] || normalizedRow['brand'] || '';
        const specialtyName = normalizedRow['spécialité'] || normalizedRow['specialty'] || '';

        // Validation
        const errors = [];

        if (!designation || designation.trim() === '') {
          errors.push('Désignation manquante');
        }

        if (!priceHT || isNaN(parseFloat(priceHT))) {
          errors.push('Prix d\'achat HT invalide');
        }

        const validTVA = [0, 0.09, 0.19, '0', '0.09', '0.19'];
        if (!tva || !validTVA.includes(tva.toString())) {
          errors.push('TVA invalide (doit être 0, 0.09 ou 0.19)');
        }

        const validCategories = ['consumable', 'patient'];
        if (!category || !validCategories.includes(category.toLowerCase())) {
          errors.push('Catégorie invalide (doit être "consumable" ou "patient")');
        }

        if (!unitOfMeasure || unitOfMeasure.trim() === '') {
          errors.push('Unité de mesure manquante');
        }

        if (errors.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            designation: designation || 'N/A',
            messages: errors
          });
          continue;
        }

        // Handle specialty
        let specialtyIds = [];
        if (specialtyName && specialtyName.trim() !== '' && specialtyName.toLowerCase() !== 'toutes les spécialités') {
          const specialty = await Specialty.findOne({ name: specialtyName.trim() });
          if (specialty) {
            specialtyIds = [specialty._id];
          } else {
            // Specialty not found, skip this material
            results.failed++;
            results.errors.push({
              row: rowNum,
              designation: designation,
              messages: [`Spécialité "${specialtyName}" non trouvée`]
            });
            continue;
          }
        }

        // Prepare material data - code will be auto-generated by the model
        const materialData = {
          designation: designation.trim(),
          reference: reference ? reference.trim() : undefined,
          priceHT: parseFloat(priceHT),
          tva: parseFloat(tva),
          category: category.toLowerCase(),
          unitOfMeasure: unitOfMeasure.trim(),
          brand: brand ? brand.trim() : undefined,
          appliesToAllSpecialties: specialtyName.toLowerCase() === 'toutes les spécialités',
          specialty: specialtyIds.length > 0 ? specialtyIds : undefined,
          sellingMarkupPercent: sellingMarkupPercent && !isNaN(parseFloat(sellingMarkupPercent)) ? parseFloat(sellingMarkupPercent) : 0
          // Note: code is NOT set here, it will be auto-generated by Material model pre-save hook
        };

        // Create and save material - code will be auto-generated
        const material = new Material(materialData);
        await material.save();
        results.imported++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          designation: row.désignation || row.designation || 'N/A',
          messages: [error.message]
        });
      }
    }

    // Render results view
    res.render("materials/import-results", {
      title: "Résultats de l'Import Matériaux",
      results,
      totalRows: data.length
    });

  } catch (error) {
    console.error("Error in importMaterials:", error);
    res.redirect(`/materials?error=${encodeURIComponent('Erreur lors du traitement du fichier: ' + error.message)}`);
  }
};




