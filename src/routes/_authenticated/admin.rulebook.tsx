import { createFileRoute } from "@tanstack/react-router";
import { SectionHeading } from "@/components/gent/primitives";
import { CrudTable, type Field } from "@/components/gent/CrudTable";

export const Route = createFileRoute("/_authenticated/admin/rulebook")({
  head: () => ({ meta: [{ title: "Rulebook — TheGent's admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const FIELDS: Field[] = [
  { key: "category", label: "Category", type: "select", options: ["face_shape", "body_type", "skin_season", "hair", "beard", "occasion"], required: true, inList: true },
  { key: "condition_key", label: "Applies to", type: "text", required: true, inList: true },
  { key: "rule_text", label: "Rule", type: "textarea", required: true, inList: true },
  { key: "priority", label: "Priority (lower first)", type: "number", required: true },
  { key: "active", label: "Active", type: "bool", inList: true },
];

function Page() {
  return (
    <div>
      <SectionHeading as="h1" eyebrow="Admin" title="Rulebook" />
      <p className="mt-2 text-sm text-muted-foreground">House rules the stylist must follow. "Applies to" is matched exactly: <code>face:oval</code>, <code>body:rectangle</code>, <code>season:deep autumn</code>, or <code>all</code>.</p>
      <CrudTable table="style_rules" fields={FIELDS} orderBy="priority" defaults={{ priority: 100, active: true }}
        csvHint="CSV columns: category, condition_key, rule_text, priority, active." />
    </div>
  );
}
