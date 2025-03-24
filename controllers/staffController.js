// controllers/staffController.js

const staffService = require("../services/staffService");

exports.getAllStaffs = async (req, res) => {
  try {
    const staffs = await staffService.getAllStaffs();
    return res.status(200).json(staffs);
  } catch (error) {
    console.error("Error fetching staffs:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await staffService.getStaffById(id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }
    return res.status(200).json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const newStaff = await staffService.createStaff(req.body);
    return res.status(201).json({
      message: "Staff created successfully",
      staff: newStaff,
    });
  } catch (error) {
    console.error("Error creating staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await staffService.updateStaff(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Staff not found" });
    }
    return res.status(200).json({ message: "Staff updated successfully" });
  } catch (error) {
    console.error("Error updating staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await staffService.deleteStaff(id);
    if (!deleted) {
      return res.status(404).json({ message: "Staff not found" });
    }
    return res.status(200).json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error("Error deleting staff:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
