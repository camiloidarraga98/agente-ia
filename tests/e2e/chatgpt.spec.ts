import { test, expect } from "@playwright/test";

test("una tarea de ChatGPT permite llevar el pedido a DOT y guardar su respuesta", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nueva tarea", exact: true }).click();
  await page.getByLabel("Nombre de la tarea").fill("Prueba con mi DOT");
  await page
    .getByLabel("Cuéntale lo que necesitas")
    .fill("Revisa un ensayo a las 15:00 y un traslado sin confirmar.");
  await page.getByLabel("Dónde quieres resolverla").selectOption("chatgpt");
  await page
    .getByRole("button", { name: "Asignar tarea", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Espera a DOT");
  await expect(page.getByLabel("Pedido para llevar a DOT")).toHaveValue(
    /INSTRUCCIONES DEL AGENTE/,
  );
  await expect(
    page.getByRole("button", { name: "Copiar pedido para DOT" }),
  ).toBeEnabled();
  await page
    .getByLabel("Respuesta de DOT")
    .fill(
      "Borrador revisado en mi ChatGPT. Confirmar duración del ensayo y traslado con Luisa.",
    );
  await page.getByRole("button", { name: "Guardar respuesta" }).click();
  await expect(page.getByRole("dialog")).toContainText("Completada");
  await expect(page.getByRole("dialog")).toContainText("Pegado por ti");
  await expect(page.getByRole("dialog")).toContainText(
    "Borrador revisado en mi ChatGPT",
  );
});

test("se puede seleccionar ChatGPT para las nuevas tareas y consultar las acciones sin exponer claves", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Conexiones", exact: true }).click();
  await page.getByRole("button", { name: "Usar mi ChatGPT" }).click();
  await expect(
    page.getByRole("button", { name: "ChatGPT seleccionado" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Trabajo en ChatGPT", { exact: true }),
  ).toBeVisible();
  await page.getByText("Conectar las acciones de DOT", { exact: true }).click();
  await expect(
    page.getByLabel("Instrucciones para las acciones"),
  ).toHaveValue(/guardarResultadoJAC/);
  await page.getByRole("button", { name: "La oficina", exact: true }).click();
  await page.getByRole("button", { name: "Nueva tarea", exact: true }).click();
  await expect(page.getByLabel("Dónde quieres resolverla")).toHaveValue(
    "chatgpt",
  );
  await page.keyboard.press("Escape");
  await request.patch("/api/settings", { data: { executionMode: "auto" } });
});
