import { Router } from "express";
import { importLeadCsv } from "../services/importService";

export const importRoutes = Router();

importRoutes.post(["/import-leads", "/api/import-leads", "/api/import-csv"], async (req, res, next) => {
  try {
    const result = await importLeadCsv({
      body: req.body,
      contentType: req.header("content-type") ?? "",
      fileName: readFileName(req.body),
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

function readFileName(body: unknown) {
  if (body && typeof body === "object" && !Array.isArray(body) && typeof (body as { fileName?: unknown }).fileName === "string") {
    return (body as { fileName: string }).fileName;
  }

  return "";
}
