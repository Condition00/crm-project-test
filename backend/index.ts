import app from "./src/app";

const port = Number(process.env.PORT ?? 3080);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
