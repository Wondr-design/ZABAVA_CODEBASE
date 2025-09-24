import { kv } from "@vercel/kv";

const EMPTY_METRICS = {
  count: 0,
  used: 0,
  unused: 0,
  visited: 0,
  notVisited: 0,
  revenue: 0,
  points: 0,
  bonusRedemptions: 0,
  averageRevenue: 0,
  averagePoints: 0,
};

function normalizePartnerId(partnerId) {
  return String(partnerId || "").trim().toLowerCase();
}

export function parsePayload(record) {
  let payload = {};
  if (record.payload) {
    try {
      payload =
        typeof record.payload === "string"
          ? JSON.parse(record.payload)
          : record.payload;

      if (payload.data && typeof payload.data === "string") {
        try {
          const nested = JSON.parse(payload.data);
          payload = { ...payload, ...nested };
        } catch (err) {
          console.warn("Failed to parse nested payload", err);
        }
      }
    } catch (err) {
      console.warn("Failed to parse payload", err);
      payload = { rawPayload: record.payload };
    }
  }
  return payload;
}

export async function loadPartnerData(partnerId) {
  const normalizedId = normalizePartnerId(partnerId);

  if (!normalizedId && !partnerId) {
    return {
      partnerId,
      submissions: [],
      metrics: { ...EMPTY_METRICS },
      partnerLabel: null,
    };
  }

  const keys = new Set();
  if (normalizedId) {
    keys.add(`partner:${normalizedId}`);
  }
  if (partnerId && partnerId !== normalizedId) {
    keys.add(`partner:${partnerId}`);
  }

  const emailSets = await Promise.all(
    Array.from(keys).map(async (key) => {
      try {
        const set = await kv.smembers(key);
        return Array.isArray(set) ? set : [];
      } catch (err) {
        console.warn(`Failed to read partner set ${key}`, err);
        return [];
      }
    })
  );

  const emails = Array.from(
    new Set(emailSets.flat().filter((value) => typeof value === "string" && value))
  );

  if (!emails || emails.length === 0) {
    return {
      partnerId,
      submissions: [],
      metrics: { ...EMPTY_METRICS },
      partnerLabel: null,
    };
  }

  const submissions = [];

  for (const email of emails) {
    try {
      const record = await kv.hgetall(`qr:email:${email}`);
      if (!record || !record.email) continue;

      const payload = parsePayload(record);
      const totalPrice = Number(payload.totalPrice || record.totalPrice || 0) || 0;
      const estimatedPoints =
        Number(payload.estimatedPoints || record.estimatedPoints || 0) || 0;

      const visited = String(record.visited || "").toLowerCase() === "true";
      const canonicalPartnerId = normalizedId || String(partnerId || "").trim();

      submissions.push({
        partnerId: canonicalPartnerId,
        email: record.email,
        used: String(record.used || "").toLowerCase() === "true",
        createdAt: record.createdAt || null,
        scannedAt: record.scannedAt || null,
        totalPrice,
        estimatedPoints,
        visited,
        visitedAt: record.visitedAt || null,
        originalPayload: payload,
        ...payload,
      });
    } catch (err) {
      console.warn(`Failed to fetch record for ${email}`, err);
    }
  }

  submissions.sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  let revenue = 0;
  let points = 0;
  let used = 0;
  let visitedCount = 0;
  let bonusRedemptions = 0;

  submissions.forEach((submission) => {
    revenue += Number(submission.totalPrice || 0);
    points += Number(submission.estimatedPoints || 0);
    if (submission.ticket === "BonusReward") {
      bonusRedemptions += 1;
    }
    if (submission.used) {
      used += 1;
    }
    if (submission.visited) {
      visitedCount += 1;
    }
  });

  const count = submissions.length;
  let partnerLabel = null;

  for (const submission of submissions) {
    partnerLabel =
      submission.partnerName ||
      submission.attractionName ||
      submission.originalPayload?.partnerName ||
      submission.originalPayload?.attractionName ||
      submission.originalPayload?.partnerLabel ||
      null;
    if (partnerLabel) {
      break;
    }
  }

  const metrics = {
    count,
    used,
    unused: count - used,
    visited: visitedCount,
    notVisited: count - visitedCount,
    revenue,
    points,
    bonusRedemptions,
    averageRevenue: count ? Math.round(revenue / count) : 0,
    averagePoints: count ? Math.round(points / count) : 0,
  };

  return {
    partnerId,
    submissions,
    metrics,
    partnerLabel,
  };
}

export { EMPTY_METRICS };
