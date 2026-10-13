import { test, expect } from "@playwright/test";

test("el despliegue muestra login, entra con sesión y protege la oficina al salir", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3062");
  await expect(
    page.getByRole("heading", { name: "Volvamos a estar en sintonía." }),
  ).toBeVisible();
  await page.getByLabel("Contraseña de acceso").fill("incorrecta");
  await page.getByRole("button", { name: "Entrar a la oficina" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "La contraseña no es correcta",
  );
  await page
    .getByLabel("Contraseña de acceso")
    .fill("test-only-jac-access-password");
  await page.getByRole("button", { name: "Entrar a la oficina" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu equipo, en sintonía." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tu equipo, en sintonía." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Volvamos a estar en sintonía." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Volvamos a estar en sintonía." }),
  ).toBeVisible();
});

test("la pantalla de acceso funciona en móvil sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3062");
  await expect(page.getByLabel("Contraseña de acceso")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
