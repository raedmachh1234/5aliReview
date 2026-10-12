"use server";

import { feedbackSubmissionSchema } from "@/lib/validation";
import type { Rating } from "@/lib/types";
import { getRepository } from "@/server/data";
import { hashKey, clientIpFrom } from "@/server/security/request";
import { rateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { logger } from "@/server/security/logger";
import { headers } from "next/headers";

export type FeedbackState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: "ratingRequired" | "generic" | "rateLimited" | "unavailable" };

/**
 * Stores an anonymous rating. Only the rating, business/location/card
 * identifiers and the source are accepted — nothing that identifies the
 * customer. The response never depends on the rating value: success always
 * leads to the same thank-you screen with the same Google Review option.
 */
export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const parsed = feedbackSubmissionSchema.safeParse({
    slug: formData.get("slug"),
    location: formData.get("location") ?? "",
    card: formData.get("card") ?? "",
    source: formData.get("source"),
    rating: formData.get("rating") ?? "",
  });
  if (!parsed.success) {
    const ratingIssue = parsed.error.issues.some((i) => i.path[0] === "rating");
    return { status: "error", error: ratingIssue ? "ratingRequired" : "generic" };
  }

  const { slug, location, card, source, rating } = parsed.data;
  try {
    const allowed = await rateLimit(hashKey("feedback", clientIpFrom(await headers()), slug), RATE_LIMITS.feedback);
    if (!allowed) return { status: "error", error: "rateLimited" };

    const repo = await getRepository();
    const result = await repo.submitFeedback({
      slug,
      locationSlug: location,
      cardCode: card,
      rating: rating as Rating,
      source,
    });
    return result === "ok" ? { status: "success" } : { status: "error", error: "unavailable" };
  } catch (err) {
    logger.error("feedback_submit_failed", err);
    return { status: "error", error: "generic" };
  }
}
