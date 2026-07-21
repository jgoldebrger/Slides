import type { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel(/email/i);
    this.password = page.getByLabel(/password/i);
    this.submit = page.getByRole("button", { name: /sign in/i });
    this.error = page.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}

export class DecksPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("/decks");
  }

  deckLinkByName(name: string) {
    return this.page.getByRole("link", { name: new RegExp(name, "i") }).first();
  }
}

export class EditorPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(deckId: string) {
    await this.page.goto(`/decks/${deckId}/editor`);
  }

  statusBadge() {
    return this.page.getByTestId("deck-status-badge");
  }

  shareToggle() {
    return this.page.getByRole("button", { name: /share link/i });
  }

  historyToggle() {
    return this.page.getByRole("button", { name: /version history/i });
  }

  failedBanner() {
    return this.page.getByRole("alert").filter({
      hasText: /slide generation failed/i,
    });
  }
}

export class ExportPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(deckId: string) {
    await this.page.goto(`/decks/${deckId}/export`);
  }

  startButton() {
    return this.page.getByTestId("start-export");
  }
}

export class ShareViewPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  unavailableHeading() {
    return this.page.getByRole("heading", {
      name: /share link is unavailable/i,
    });
  }

  deckTitle(name: string) {
    return this.page.getByRole("heading", { name: new RegExp(name, "i") });
  }
}
