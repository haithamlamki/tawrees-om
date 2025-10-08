import { supabase } from "@/integrations/supabase/client";

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const subscribeToPushNotifications = async (userId: string) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.VAPID_PUBLIC_KEY || ""
      ) as any,
    });

    const subscriptionJSON = subscription.toJSON();

    await supabase.from("push_subscriptions").insert({
      user_id: userId,
      endpoint: subscriptionJSON.endpoint || "",
      p256dh_key: subscriptionJSON.keys?.p256dh || "",
      auth_key: subscriptionJSON.keys?.auth || "",
      user_agent: navigator.userAgent,
    });

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    throw error;
  }
};

export const unsubscribeFromPushNotifications = async (userId: string) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);
    }
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    throw error;
  }
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const sendTestNotification = async () => {
  if (Notification.permission === "granted") {
    new Notification("Tawreed Test", {
      body: "Push notifications are working!",
      icon: "/favicon.png",
      badge: "/favicon.png",
    });
  }
};