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

  const submissions = [];

  const visitSetKeys = new Set();
  const addVisitKeyVariant = (value) => {
    if (!value) return;
    const trimmed = String(value).trim();
    if (!trimmed) return;
    visitSetKeys.add(`partner:visits:${trimmed}`);
  };

  addVisitKeyVariant(partnerId);
  addVisitKeyVariant(normalizedId);
  if (partnerId) {
    addVisitKeyVariant(String(partnerId).toLowerCase());
    addVisitKeyVariant(String(partnerId).toUpperCase());
  }
  if (normalizedId) {
    addVisitKeyVariant(normalizedId.toUpperCase());
  }

  const visitRecordKeys = new Set();

  for (const visitSetKey of visitSetKeys) {
    try {
      const members = await kv.smembers(visitSetKey);
      if (Array.isArray(members)) {
        members.forEach((member) => {
          if (
            typeof member === "string" &&
            member &&
            member.startsWith("qr:")
          ) {
            visitRecordKeys.add(member);
          }
        });
      }
    } catch (err) {
      console.warn(`Failed to read partner visit set ${visitSetKey}`, err);
    }
  }

  const truthyStatuses = new Set([
    "true",
    "used",
    "redeemed",
    "completed",
    "yes",
    "awarded",
    "1",
  ]);

  const visitedStatuses = new Set([
    "true",
    "visited",
    "completed",
    "redeemed",
    "checkedin",
    "checked-in",
    "checked_in",
    "approved",
    "yes",
    "1",
  ]);

  const loadRecordFromKey = async (visitKey) => {
    let record = null;
    try {
      record = await kv.hgetall(visitKey);
    } catch (err) {
      console.warn(`Failed to fetch visit record ${visitKey}`, err);
    }
    return record;
  };

  if (visitRecordKeys.size > 0) {
    for (const visitKey of visitRecordKeys) {
      const visitMatch = /^qr:([^:]+):([^:]+):(.+)$/.exec(visitKey);
      const visitEmailFromKey = visitMatch?.[1] || "";
      const visitPartnerFromKey = visitMatch?.[2] || "";
      const visitIdFromKey = visitMatch?.[3] || null;

      let record = await loadRecordFromKey(visitKey);

      if (!record || Object.keys(record).length === 0) {
        if (visitEmailFromKey) {
          try {
            record = await kv.hgetall(`qr:email:${visitEmailFromKey}`);
          } catch (err) {
            console.warn(
              `Failed to load legacy record for ${visitEmailFromKey} as fallback`,
              err
            );
          }
        }
      } else if (visitEmailFromKey) {
        try {
          const legacyRecord = await kv.hgetall(`qr:email:${visitEmailFromKey}`);
          if (legacyRecord && Object.keys(legacyRecord).length > 0) {
            record = { ...legacyRecord, ...record };
          }
        } catch (err) {
          console.warn(
            `Failed to merge legacy record for ${visitEmailFromKey}`,
            err
          );
        }
      }

      if (!record || Object.keys(record).length === 0) {
        continue;
      }

      const payload = parsePayload(record);

      const totalPrice =
        Number(
          payload.totalPrice ??
            payload.price ??
            record.totalPrice ??
            record.price ??
            0
        ) || 0;

      const estimatedPointsValue =
        Number(
          payload.estimatedPoints ??
            payload.points ??
            record.estimatedPoints ??
            0
        ) || 0;

      const pointsAwarded =
        Number(record.pointsAwarded ?? payload.pointsAwarded ?? 0) || 0;

      const statusCandidates = [
        record.used,
        payload.used,
        record.status,
        payload.status,
      ]
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).trim().toLowerCase());

      const used = statusCandidates.some((value) => truthyStatuses.has(value));

      const visitedValues = [
        record.visited,
        payload.visited,
        record.status,
        payload.status,
      ]
        .filter((value) => value !== undefined && value !== null)
        .map((value) => String(value).trim().toLowerCase());

      const visited =
        visitedValues.some((value) => visitedStatuses.has(value)) ||
        Boolean(record.visitedAt) ||
        Boolean(payload.visitedAt);

      let canonicalPartnerId =
        normalizePartnerId(record.partnerId) ||
        normalizePartnerId(visitPartnerFromKey) ||
        normalizedId ||
        normalizePartnerId(partnerId);

      if (!canonicalPartnerId) {
        canonicalPartnerId =
          record.partnerId ||
          visitPartnerFromKey ||
          (typeof partnerId === "string" ? partnerId : String(partnerId || ""));
      }

      const email =
        record.email ||
        payload.email ||
        visitEmailFromKey ||
        (record.normalizedEmail || "");

      const createdAt =
        record.createdAt ||
        payload.createdAt ||
        record.updatedAt ||
        payload.updatedAt ||
        record.visitedAt ||
        payload.visitedAt ||
        null;

      const scannedAt = record.scannedAt || payload.scannedAt || null;

      const submission = {
        ...payload,
        partnerId: canonicalPartnerId,
        visitId: record.visitId || payload.visitId || visitIdFromKey,
        qrKey: visitKey,
        email,
        used,
        status: record.status || payload.status || null,
        createdAt,
        updatedAt: record.updatedAt || payload.updatedAt || null,
        scannedAt,
        totalPrice,
        estimatedPoints: pointsAwarded || estimatedPointsValue,
        pointsAwarded,
        visited,
        visitedAt: record.visitedAt || payload.visitedAt || null,
        originalPayload: payload,
      };

      submissions.push(submission);
    }
  }

  if (submissions.length === 0) {
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
      new Set(
        emailSets.flat().filter((value) => typeof value === "string" && value)
      )
    );

    if (!emails || emails.length === 0) {
      return {
        partnerId,
        submissions: [],
        metrics: { ...EMPTY_METRICS },
        partnerLabel: null,
      };
    }

    for (const email of emails) {
      try {
        const record = await kv.hgetall(`qr:email:${email}`);
        if (!record || !record.email) continue;

        const payload = parsePayload(record);
        const totalPrice =
          Number(payload.totalPrice || record.totalPrice || 0) || 0;
        const estimatedPoints =
          Number(payload.estimatedPoints || record.estimatedPoints || 0) || 0;
        const pointsAwarded =
          Number(record.pointsAwarded || payload.pointsAwarded || 0) || 0;

        const statusCandidates = [
          record.used,
          payload.used,
          record.status,
          payload.status,
        ]
          .filter((value) => value !== undefined && value !== null)
          .map((value) => String(value).trim().toLowerCase());

        const used = statusCandidates.some((value) => truthyStatuses.has(value));

        const visitedValues = [
          record.visited,
          payload.visited,
          record.status,
          payload.status,
        ]
          .filter((value) => value !== undefined && value !== null)
          .map((value) => String(value).trim().toLowerCase());

        const visited =
          visitedValues.some((value) => visitedStatuses.has(value)) ||
          String(record.visited || "").toLowerCase() === "true" ||
          Boolean(record.visitedAt) ||
          Boolean(payload.visitedAt);

        const createdAt =
          record.createdAt ||
          payload.createdAt ||
          record.updatedAt ||
          payload.updatedAt ||
          record.visitedAt ||
          payload.visitedAt ||
          null;

        const scannedAt = record.scannedAt || payload.scannedAt || null;

        const canonicalPartnerId =
          normalizedId || String(partnerId || "").trim();

        submissions.push({
          ...payload,
          partnerId: canonicalPartnerId,
          email: record.email,
          used,
          createdAt,
          scannedAt,
          totalPrice,
          estimatedPoints: pointsAwarded || estimatedPoints,
          pointsAwarded,
          visited,
          visitedAt: record.visitedAt || payload.visitedAt || null,
          originalPayload: payload,
        });
      } catch (err) {
        console.warn(`Failed to fetch record for ${email}`, err);
      }
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
    const submissionPoints = submission.pointsAwarded
      ? Number(submission.pointsAwarded || 0)
      : Number(submission.estimatedPoints || 0);
    points += submissionPoints;
    const ticketType = submission.ticket || submission.ticketType || "";
    if (String(ticketType).toLowerCase() === "bonusreward") {
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
