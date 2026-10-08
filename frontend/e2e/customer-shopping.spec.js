import { expect, test } from '@playwright/test'

const testProductName = 'PRODUCTO TEST E2E'

function getTestCredentials() {
  const email = process.env.E2E_CLIENT_EMAIL
  const password = process.env.E2E_CLIENT_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Definí E2E_CLIENT_EMAIL y E2E_CLIENT_PASSWORD antes de ejecutar el test E2E.'
    )
  }

  return { email, password }
}

test('un cliente puede agregar un producto disponible a su pedido', async ({ page }) => {
  const { email, password } = getTestCredentials()

  await page.goto('/')

  await page.getByRole('button', { name: 'Ingresar', exact: true }).first().click()

  const authDialog = page.getByRole('dialog', { name: 'Bienvenido a DOSIS' })
  await authDialog.getByLabel('Email').fill(email)
  await authDialog.getByLabel('Contraseña').fill(password)
  await authDialog.locator('form').getByRole('button', { name: 'Ingresar', exact: true }).click()

  const cartButton = page.getByRole('button', { name: /Pedido/ })
  await expect(cartButton).toBeVisible()

  await page.getByLabel('Buscar por nombre').fill(testProductName)
  const addToCartButton = page.getByRole('button', { name: 'Agregar', exact: true })
  await expect(addToCartButton).toBeVisible()
  await addToCartButton.click()

  await cartButton.click()

  const cartDialog = page.getByRole('dialog', { name: 'Tu pedido' })
  await expect(cartDialog).toContainText(testProductName)
})
