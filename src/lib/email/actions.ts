"use server";

import { UserRole } from "@/app/generated/prisma";
import { db } from "../db";
import { Resend } from "resend";
import { JSX } from "react";

export async function sendMail({
  to,
  subject,
  react,
  includeAdmins = true,
}: {
  to: string[];
  subject: string;
  react: JSX.Element;
  includeAdmins?: boolean;
}) {
  const adminEmails = process.env.ADMIN_EMAILS!.split(",");
  const adminUsers = await db.user.findMany({
    where: { role: UserRole.ADMIN },
  });
  if (process.env.NODE_ENV !== "development") {
    adminUsers.forEach((user) => {
      if (user.email && !adminEmails.includes(user.email)) {
        adminEmails.push(user.email);
      }
    });
  }
  const finalCC = includeAdmins ? adminEmails.splice(0, 3) : []; // send to first 3 admins
  // console.log({ finalCC, env: env.NODE_ENV })

  if (process.env.NODE_ENV === "development" && !adminEmails.includes(to[0])) {
    return;
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const data = await resend.emails.send({
    from: `DevHub <${process.env.SMTP_FROM}>`,
    to: [...to],
    cc: finalCC,
    subject: subject,
    react,
  });

  return data;
}
