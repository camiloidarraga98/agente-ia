import { test, expect } from "@playwright/test";

test("la oficina permite seleccionar un agente y asignarle una tarea", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tu equipo, en sintonía." }),
  ).toBeVisible();
  await expect(
    page.getByText("Modo demostración", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Asignar una tarea a/ }),
  ).toHaveCount(5);
  await page.getByRole("button", { name: "Asignar una tarea a Atlas" }).click();
  await expect(page.getByRole("dialog")).toContainText("Conoce a Atlas");
  await page.getByRole("button", { name: "Pedirle una tarea" }).click();
  await expect(page.getByLabel("Asigna un agente")).toHaveValue("atlas");
  await page.getByLabel("Nombre de la tarea").fill("Itinerario de prueba E2E");
  await page
    .getByLabel("Cuéntale lo que necesitas")
    .fill(
      "Show el 24 de octubre. Prueba de sonido a las 16:00. Falta confirmar el traslado.",
    );
  await page
    .getByRole("button", { name: "Asignar tarea", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "VISTA DE DEMOSTRACIÓN",
    { timeout: 8000 },
  );
  await expect(page.getByRole("dialog")).toContainText("Show el 24 de octubre");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar borrador" }).click();
  expect((await download).suggestedFilename()).toMatch(/jac-itinerario.*\.txt/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: /^Mis tareas/ }).click();
  await page.getByLabel("Buscar tareas").fill("Itinerario de prueba E2E");
  await expect(page.locator(".task-row")).toHaveCount(1);
  await expect(page.locator(".task-row")).toContainText("Completada");
  expect(errors).toEqual([]);
});

test("el flujo crea y completa los cinco pasos y permite consultar los resultados", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Crear un itinerario" }).click();
  await page
    .getByLabel("Brief del itinerario")
    .fill(
      "Luisa: confirmar dirección del recinto. DOT: show el 25 de octubre y prueba de sonido a las 15:00.",
    );
  await page
    .getByRole("button", { name: "Iniciar flujo", exact: true })
    .click();
  await expect(page.locator(".run-card").first()).toContainText(
    "5 pasos creados",
    { timeout: 10000 },
  );
  await expect(page.locator(".run-heading").first()).toContainText(
    "Completada",
  );
  await page.locator(".run-steps").first().getByRole("button").last().click();
  await expect(page.getByRole("dialog")).toContainText(
    "BORRADOR PARA REVISIÓN DE LUISA",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "pendiente de revisión humana",
  );
});

test("las instrucciones se guardan y la conexión pendiente no simula acceso a Slack", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Conectar Slack", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Todo en el mismo lugar." }),
  ).toBeVisible();
  await page
    .getByLabel("Instrucciones de DOT")
    .fill(
      "Consulta con Luisa todas las reservas y conserva el horario de Colombia.",
    );
  await page.getByLabel("ID del canal").fill("C0123456789");
  await page.getByRole("button", { name: "Guardar configuración" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Configuración guardada",
  );
  await page.reload();
  await page.getByRole("button", { name: "Conexiones", exact: true }).click();
  await expect(page.getByLabel("Instrucciones de DOT")).toHaveValue(
    "Consulta con Luisa todas las reservas y conserva el horario de Colombia.",
  );
  await expect(
    page.getByText("Pendiente de conexión", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cómo conectar el canal" }).click();
  await expect(page.getByRole("dialog")).toContainText("JAC_SLACK_BOT_TOKEN");
  await expect(page.getByRole("dialog")).toContainText("channels:history");
});

test("en móvil no hay desbordamiento y el menú permite navegar y crear tareas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tu equipo, en sintonía." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("button", { name: "Flujos de trabajo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "De idea a itinerario." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Iniciar flujo", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Conexiones", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Todo en el mismo lugar." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
