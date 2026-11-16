import { createManual, listManual as list, softDeleteManual } from "../services/contributionService.js";

const fail = (res, e, fallback) =>
  res.status(e.statusCode || 500).json({ success: false, error: e.message || fallback });

export const listManual = (type) => async (req, res) => {
  try {
    const data = await list(type);
    res.json({ success: true, count: data.length, data });
  } catch (e) { console.error(e); fail(res, e, "Failed to load contributed entries"); }
};

export const create = (type) => async (req, res) => {
  try {
    const data = await createManual(type, req.body, req.user);
    res.status(201).json({ success: true, message: `${type} added successfully.`, data });
  } catch (e) { console.error(e); fail(res, e, `Failed to add ${type}`); }
};

export const remove = (type) => async (req, res) => {
  try {
    const data = await softDeleteManual(type, req.params.id, req.user?.name || "SMART Admin");
    res.json({ success: true, data });
  } catch (e) { console.error(e); fail(res, e, `Failed to delete ${type}`); }
};