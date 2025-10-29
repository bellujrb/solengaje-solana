const appUrl = process.env.NEXT_PUBLIC_URL || "";

type NotificationDetails = {
  url: string;
  token: string;
};

type SendNotificationRequest = {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
  tokens: string[];
};

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendFrameNotification({
  title,
  body,
  notificationDetails,
}: {
  title: string;
  body: string;
  notificationDetails?: NotificationDetails | null;
}): Promise<SendFrameNotificationResult> {
  // Se não há detalhes de notificação, retorna sem token
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  try {
    const response = await fetch(notificationDetails.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title,
        body,
        targetUrl: appUrl,
        tokens: [notificationDetails.token],
      } satisfies SendNotificationRequest),
    });

    const responseJson = await response.json();

    if (response.status === 200) {
      // Verifica se há tokens com rate limit
      if (responseJson.result?.rateLimitedTokens?.length) {
        return { state: "rate_limit" };
      }

      return { state: "success" };
    }

    return { state: "error", error: responseJson };
  } catch (error) {
    return { state: "error", error };
  }
}
