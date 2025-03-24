// services/resourcesService.js
const db = require("../db");

exports.getAllResources = async () => {
  const [rows] = await db.query("SELECT * FROM resources WHERE isResource = 1 ORDER BY created_at DESC");
  return rows;
};

exports.getAllWellness = async () => {
  const [rows] = await db.query("SELECT * FROM resources WHERE isResource = 0 ORDER BY created_at DESC");
  return rows;
};

exports.getResourceById = async (id) => {
  const [rows] = await db.query("SELECT * FROM resources WHERE ID = ?", [id]);
  return rows[0];
};

exports.createResource = async (resourceData) => {
  const { isResource, title, category, resourceType, description, filepath, banner } = resourceData;
  
  const sql = `
    INSERT INTO resources 
      (isResource, title, category, resourceType, description, filepath, banner)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    isResource,
    title,
    category,
    resourceType || null,
    description,
    filepath,
    banner || ""
  ]);

  return {
    ID: result.insertId,
    isResource,
    title,
    category,
    resourceType,
    description,
    filepath,
    banner: banner || "",
    created_at: new Date(),
    modified_at: new Date(),
  };
};

exports.updateResource = async (id, resourceData) => {
  const { isResource, title, category, resourceType, description, filepath, banner } = resourceData;
  
  const sql = `
    UPDATE resources 
    SET 
      isResource = COALESCE(?, isResource),
      title = COALESCE(?, title),
      category = COALESCE(?, category),
      resourceType = COALESCE(?, resourceType),
      description = COALESCE(?, description),
      filepath = COALESCE(?, filepath),
      banner = COALESCE(?, banner),
      modified_at = NOW()
    WHERE ID = ?
  `;

  const [result] = await db.query(sql, [
    isResource,
    title,
    category,
    resourceType,
    description,
    filepath,
    banner,
    id,
  ]);
  
  return result.affectedRows;
};


exports.deleteResources = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid input: IDs must be a non-empty array.");
  }

  const sql = `DELETE FROM resources WHERE ID IN (?)`;
  const [result] = await db.query(sql, [ids]);

  return result.affectedRows; // Returns number of deleted rows
};