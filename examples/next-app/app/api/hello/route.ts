import { getVariantSSR, getVariantValueSSR } from "@variantlab/next";
import experiments from "../../../experiments.json";

export const runtime = "edge";

export function GET(req: Request) {
  const heroCopy = getVariantValueSSR<string>("hero-copy", req, experiments);
  const ctaColor = getVariantValueSSR<string>("cta-color", req, experiments);
  const layout = getVariantSSR("layout", req, experiments);

  return Response.json({
    experiments: {
      "hero-copy": heroCopy,
      "cta-color": ctaColor,
      layout,
    },
    note: "These values come from the sticky cookie written by middleware.",
  });
}
