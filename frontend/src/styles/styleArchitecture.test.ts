import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as sass from "sass";

const styles = join(process.cwd(), "src/styles");

const aggregators: Record<string, string[]> = {
  "_03_tree_workspace.scss": [
    "tree-workspace/shell",
    "tree-workspace/header-actions",
    "tree-workspace/surface",
    "tree-workspace/people-list",
    "tree-workspace/picker-drawer",
    "tree-workspace/coach",
    "tree-workspace/person-panel",
  ],
  "_08_modals_auth.scss": [
    "modals-auth/dialogs-settings",
    "modals-auth/loaders-photo",
    "modals-auth/auth",
    "modals-auth/tree-entry",
    "modals-auth/onboarding",
    "modals-auth/invitation-claim",
    "modals-auth/legal",
  ],
  "_11_home.scss": [
    "home/foundation-hero",
    "home/feature-stories",
    "home/illustrations",
    "home/kinship-privacy",
    "home/faq",
    "home/footer",
    "home/responsive",
  ],
};

const deadSelectors = [
  ".search-panel-toolbar",
  ".search-results-dropdown",
  ".filter-modal",
  ".tutorial-popup",
  ".onboarding-popup",
  ".tree-page-header__row-one",
  ".tree-page-header__brand",
  ".tree-tour",
  ".person-actions__overflow",
  ".voice-search-btn-simple",
  ".photo-upload-zone",
  ".photo-upload-input",
];

function scssFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? scssFiles(path) : path.endsWith(".scss") ? [path] : [];
  });
}

describe("global style architecture", () => {
  it("keeps numbered style files as short, ordered aggregators", () => {
    for (const [filename, imports] of Object.entries(aggregators)) {
      const source = readFileSync(join(styles, filename), "utf8");
      const actual = Array.from(source.matchAll(/@import\s+"([^"]+)";/g), (match) => match[1]);
      expect(actual, filename).toEqual(imports);
      expect(source.split("\n").length, filename).toBeLessThan(50);
    }
  });

  it("keeps ownership partials below the agreed size ceiling", () => {
    for (const folder of ["tree-workspace", "modals-auth", "home"]) {
      for (const file of scssFiles(join(styles, folder))) {
        expect(readFileSync(file, "utf8").split("\n").length, file).toBeLessThanOrEqual(500);
      }
    }
  });

  it("removes obsolete global selectors", () => {
    const source = scssFiles(styles)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const selector of deadSelectors) {
      expect(source, selector).not.toContain(selector);
    }
  });

  it("compiles the complete global stylesheet", () => {
    expect(() =>
      sass.compile(join(styles, "globals.scss"), {
        loadPaths: [styles],
        style: "compressed",
        silenceDeprecations: ["import"],
      }),
    ).not.toThrow();
  });
});
