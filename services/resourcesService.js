// services/resourcesService.js
const db = require("../db");

exports.getAllResources = async () => {
  const [rows] = await db.query("SELECT * FROM resources WHERE isResource = 1 ORDER BY created_at DESC");
  return rows;
};

exports.getAllWellness = async () => {
  const [rows] = await db.query("SELECT * FROM resources WHERE isResource = 0 ORDER BY created_at ASC");
  return rows;
};

exports.getResourceById = async (id) => {
  const [rows] = await db.query("SELECT * FROM resources WHERE ID = ?", [id]);
  return rows[0];
};

exports.createResource = async (resourceData) => {
  const { isResource, title, category, resourceType, description, filepath, banner, status, posted_at } = resourceData;
  
  const sql = `
    INSERT INTO resources 
      (isResource, title, category, resourceType, description, filepath, banner, status, posted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    isResource,
    title,
    category,
    resourceType || null,
    description,
    filepath,
    banner || "",
    status,
    posted_at,
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
    status,
    posted_at,
  };
};

exports.updateResource = async (id, resourceData) => {
  const { isResource, title, category, resourceType, description, filepath, banner, status, posted_at } = resourceData;
  
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
      status = COALESCE(?, status),
      posted_at = COALESCE(?, posted_at),
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
    status,
    posted_at,
    id,
  ]);
  
  return result.affectedRows;
};


exports.deleteResources = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid input: IDs must be a non-empty array.");
  }

  const placeholders = ids.map(() => '?').join(',');
  const sql = `DELETE FROM resources WHERE ID IN (${placeholders})`;
  
  const [result] = await db.query(sql, ids);
  return result.affectedRows; // Returns number of deleted rows
};
