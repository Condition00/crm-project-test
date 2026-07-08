import express, { type Request, type Response } from "express";

const app = express();
const port = 3080;

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Bun and TypeScript!" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
