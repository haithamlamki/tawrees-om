import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  recipientUserId: string;
  templateType: string;
  subject: string;
  metadata?: Record<string, any>;
}

export const sendNotificationEmail = async ({
  recipientUserId,
  templateType,
  subject,
  metadata,
}: SendEmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification-email", {
      body: {
        recipientUserId,
        templateType,
        subject,
        metadata,
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error sending notification email:", error);
    return { success: false, error };
  }
};

export const createInAppNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  relatedId?: string
) => {
  try {
    const { data, error } = await supabase.rpc("create_notification", {
      p_user_id: userId,
      p_title: title,
      p_message: message,
      p_type: type,
      p_related_id: relatedId || null,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }
};

export const sendQuoteReadyNotification = async (
  userId: string,
  requestId: string,
  totalPrice: number,
  validUntil: string
) => {
  // Create in-app notification
  await createInAppNotification(
    userId,
    "Quote Ready",
    `Your shipping quote is ready! Total: ₦${totalPrice.toFixed(2)}`,
    "quote_ready",
    requestId
  );

  // Send email
  await sendNotificationEmail({
    recipientUserId: userId,
    templateType: "quote_ready",
    subject: "Your Shipping Quote is Ready",
    metadata: {
      totalPrice: totalPrice.toFixed(2),
      validUntil: new Date(validUntil).toLocaleDateString(),
    },
  });
};

export const sendStatusUpdateNotification = async (
  userId: string,
  shipmentId: string,
  status: string,
  trackingNumber: string,
  location?: string
) => {
  // Create in-app notification
  await createInAppNotification(
    userId,
    "Shipment Status Update",
    `Your shipment status: ${status.replace("_", " ")}`,
    "status_update",
    shipmentId
  );

  // Send email
  await sendNotificationEmail({
    recipientUserId: userId,
    templateType: "status_update",
    subject: "Shipment Status Update",
    metadata: {
      status: status.replace("_", " "),
      trackingNumber,
      location,
    },
  });
};

export const sendRequestApprovedNotification = async (
  userId: string,
  requestId: string,
  trackingNumber: string
) => {
  // Create in-app notification
  await createInAppNotification(
    userId,
    "Request Approved",
    `Your shipment request has been approved! Tracking: ${trackingNumber}`,
    "request_approved",
    requestId
  );

  // Send email
  await sendNotificationEmail({
    recipientUserId: userId,
    templateType: "request_approved",
    subject: "Your Shipment Request is Approved",
    metadata: {
      trackingNumber,
    },
  });

  // Send push notification
  await sendPushNotification({
    userId,
    title: "Request Approved",
    body: `Your shipment request has been approved! Tracking: ${trackingNumber}`,
    url: `/tracking/${trackingNumber}`,
  });
};

export const sendPushNotification = async ({
  userId,
  title,
  body,
  url,
}: {
  userId: string;
  title: string;
  body: string;
  url?: string;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        userId,
        title,
        body,
        url,
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error };
  }
};

export const sendOrderApprovedNotification = async (
  customerId: string,
  shipmentId: string,
  partnerName: string,
  trackingNumber: string
) => {
  await createInAppNotification(
    customerId,
    "Order Approved",
    `Your order has been approved and assigned to ${partnerName}. Tracking: ${trackingNumber}`,
    "shipment_approved",
    shipmentId
  );

  await sendNotificationEmail({
    recipientUserId: customerId,
    templateType: "order_approved",
    subject: "Your Order Has Been Approved",
    metadata: {
      partnerName,
      trackingNumber,
    },
  });
};

export const sendPartnerAssignedNotification = async (
  partnerId: string,
  shipmentId: string,
  trackingNumber: string
) => {
  const { data: partnerUsers } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("shipping_partner_id", partnerId)
    .eq("role", "shipping_partner");

  if (partnerUsers) {
    for (const partnerUser of partnerUsers) {
      await createInAppNotification(
        partnerUser.user_id,
        "New Order Assignment",
        `You have been assigned a new order. Tracking: ${trackingNumber}`,
        "partner_assigned",
        shipmentId
      );
    }
  }
};

export const sendPartnerAcceptanceNotification = async (
  customerId: string,
  shipmentId: string,
  partnerInfo: any,
  trackingNumber: string
) => {
  await createInAppNotification(
    customerId,
    "Order Accepted",
    `${partnerInfo.company_name} has accepted your order. Tracking: ${trackingNumber}`,
    "partner_accepted",
    shipmentId
  );

  await sendNotificationEmail({
    recipientUserId: customerId,
    templateType: "partner_accepted",
    subject: "Your Order Is Now In Transit",
    metadata: {
      trackingNumber,
      partnerName: partnerInfo.company_name,
      partnerContact: partnerInfo.contact_person,
      partnerPhone: partnerInfo.phone,
      partnerEmail: partnerInfo.email,
    },
  });
};

export const sendDeliveryCompletedNotification = async (
  customerId: string,
  shipmentId: string,
  trackingNumber: string
) => {
  await createInAppNotification(
    customerId,
    "Order Delivered",
    `Your order ${trackingNumber} has been delivered. Please confirm receipt.`,
    "delivered",
    shipmentId
  );

  await sendNotificationEmail({
    recipientUserId: customerId,
    templateType: "delivery_completed",
    subject: "Your Order Has Been Delivered",
    metadata: {
      trackingNumber,
    },
  });
};
