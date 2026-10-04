import { createFileRoute } from "@tanstack/react-router";
import { SectionHeading } from "@/components/gent/primitives";
import { CrudTable, type Field } from "@/components/gent/CrudTable";

export const Route = createFileRoute("/_authenticated/admin/catalog")({
  head: () => ({ meta: [{ title: "Catalogue — TheGent's admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const FIELDS: Field[] = [
  { key: "category", label: "Category", type: "text", required: true, inList: true },
  { key: "name", label: "Name", type: "text", required: true, inList: true },
  { key: "brand", label: "Brand", type: "text", inList: true },
  { key: "colour", label: "Colour", type: "text" },
  { key: "colour_hex", label: "Colour hex", type: "text" },
  { key: "fit_notes", label: "Fit notes", type: "textarea" },
  { key: "price_min", label: "Price from (₹)", type: "number", inList: true },
  { key: "price_max", label: "Price to (₹)", type: "number" },
  { key: "url", label: "Product link", type: "text" },
  { key: "affiliate_url", label: "Affiliate link", type: "text" },
  { key: "image_url", label: "Image link", type: "text" },
  { key: "tags", label: "Tags (size:m, waist:32 …)", type: "tags" },
  { key: "shape", label: "Frame shape (eyewear)", type: "text" },
  { key: "rim", label: "Rim (eyewear)", type: "text" },
  { key: "lens_width_mm", label: "Lens width mm", type: "number" },
  { key: "bridge_mm", label: "Bridge mm", type: "number" },
  { key: "temple_mm", label: "Temple mm", type: "number" },
  { key: "active", label: "Active", type: "bool", inList: true },
];

function Page() {
  return (
    <div>
      <SectionHeading as="h1" eyebrow="Admin" title="Product catalogue" />
      <p className="mt-2 text-sm text-muted-foreground">The stylist picks from up to 150 active products that fit the customer's budget and size. Add size tags like <code>size:m</code> or <code>waist:32</code>; products without size tags fit everyone.</p>
      <CrudTable table="products_catalog" fields={FIELDS} orderBy="category" defaults={{ active: true, tags: [] }}
        csvHint="CSV columns use the field names: category, name, brand, colour, colour_hex, fit_notes, price_min, price_max, url, affiliate_url, image_url, tags, shape, rim, lens_width_mm, bridge_mm, temple_mm, active." />
    </div>
  );
}
