import express, { type Request, type Response } from "express";

type ImportLeadRow = Array<string | number | null | undefined>;

type ImportLeadsRequestBody = {
  fileName?: string;
  headers?: unknown[];
  rows?: unknown[];
};

const app = express();
const port = 3080;

app.use(express.json({ limit: "10mb" }));

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Bun and TypeScript!" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
