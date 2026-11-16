import { Inngest } from "inngest";
import { prisma } from "../src/config/prisma.js";

// Create an Inngest client
export const inngest = new Inngest({
  id: "project-management",
});

// ==========================================
// 1. Sync User Creation
// ==========================================

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },

  async ({ event, step }) => {
    const { data } = event;

    const primaryEmail =
      data.email_addresses?.find(
        (email) => email.id === data.primary_email_address_id,
      ) ?? data.email_addresses?.[0];

    if (!primaryEmail?.email_address) {
      throw new Error(`No email found for user: ${data.id}`);
    }

    const userData = {
      id: data.id,
      email: primaryEmail.email_address,
      name:
        [data.first_name, data.last_name].filter(Boolean).join(" ") ||
        primaryEmail.email_address,
      image: data.image_url ?? "",
    };

    await step.run("save-user-to-database", async () => {
      return prisma.user.upsert({
        where: { id: data.id },
        create: userData,
        update: userData,
      });
    });
  },
);

// ==========================================
// 2. Sync User Deletion
// ==========================================

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },

  async ({ event, step }) => {
    const { data } = event;

    await step.run("delete-user-from-database", async () => {
      return prisma.user.deleteMany({
        where: {
          id: data.id,
        },
      });
    });
  },
);

const syncUserUpdation = inngest.createFunction(
  { id: "sync-user-updation" },
  { event: "clerk/user.updated" },

  async ({ event, step }) => {
    const { data } = event;

    const primaryEmail =
      data.email_addresses?.find(
        (email) => email.id === data.primary_email_address_id,
      ) ?? data.email_addresses?.[0];

    if (!primaryEmail?.email_address) {
      throw new Error(`No email found for user: ${data.id}`);
    }

    const userData = {
      email: primaryEmail.email_address,
      name:
        [data.first_name, data.last_name].filter(Boolean).join(" ") ||
        primaryEmail.email_address,
      image: data.image_url ?? "",
    };

    await step.run("update-user-in-database", async () => {
      return prisma.user.update({
        where: {
          id: data.id,
        },
        data: userData,
      });
    });
  },
);

// ==========================================
// Export all Inngest functions
// ==========================================

export const functions = [
  syncUserCreation,
  syncUserDeletionو,
  syncUserUpdation,
];
