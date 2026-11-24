"use client";

import Link from "next/link";
import ExampleShowcase from "./ExampleShowcase";
import ChargeStation from "./ChargeStation";
import Film from "./Film";
import { Novelty, Plan, WefeFit, Working } from "./Pitch";
import { useT } from "@/lib/i18n";

// Order follows the Smart Campus 2026 judging sheet (docs/contest/README.md):
// why it matters → fit with WEFE (35%) → what's new (25%) → a working product to try (25%)
// → examples → plan.
export default function Landing() {
  const { t } = useT();
  return (
    <>
      <Film />
      <WefeFit />
      <Novelty />
      <Working />

      <section className="story-finish" id="try">
        <h2 className="section-head">{t("home.finish")}</h2>
        <ChargeStation />
      </section>

      <section>
        <h2 className="section-head" id="examples">{t("home.examples")}</h2>
        <ExampleShowcase />
      </section>

      <Plan />

      <section className="cta-band">
        <div>
          <h2>{t("home.ctaband.title")}</h2>
          <p>{t("home.ctaband.sub")}</p>
        </div>
        <Link href="/analyze" className="cta-btn invert">{t("home.cta.primary")}</Link>
      </section>
    </>
  );
}
