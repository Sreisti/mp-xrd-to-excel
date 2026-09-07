# MP XRD → Excel

A small static web page that converts the "XRD JSON" file you can download from a
[Materials Project](https://legacy.materialsproject.org/) material page into an
Excel sheet of 2Θ and hkl values — no server, no build step, runs entirely in
the browser.

## Usage

1. Open `index.html` (double-click it, or host it — see below).
2. On [legacy.materialsproject.org](https://legacy.materialsproject.org/), open a
   material page, e.g. [mp-492 (TiN)](https://legacy.materialsproject.org/materials/mp-492/).
3. Click the **X-Ray Diffraction** tab, pick a radiation source if needed, then
   click the **XRD JSON** button above the plot and save the file.
4. Drag that file onto the page (you can drop several at once, one per
   material/element).
5. Click **Download Excel (.xlsx)**. Each file becomes its own sheet, with
   columns `2Θ` and `hkl`, sorted by 2Θ.

A sample input file is included at `examples/mp-492-TiN.json` — drop it in to
see it reproduce the reference TiN table this tool was built against.

## Notes on the hkl format

Materials Project concatenates single-digit, non-negative Miller indices
(e.g. `(1,1,1)` → `111`), which is what most cubic materials look like. If a
material has a negative or multi-digit index, this tool falls back to a
spaced form (e.g. `1 1 -1`) instead of concatenating, since that would be
ambiguous.

## Deploying on GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo, go to **Settings → Pages**, set the source to the branch and
   root folder containing `index.html`.
3. The page will be live at `https://<username>.github.io/<repo>/`.

No API keys, backend, or build step are needed — everything (JSON parsing and
`.xlsx` generation via [SheetJS](https://sheetjs.com/)) happens client-side.

## Data source / license

XRD pattern data comes from the [Materials Project](https://legacy.materialsproject.org/open),
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
