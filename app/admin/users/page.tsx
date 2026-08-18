import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listManagedUsers } from "@/features/users/service";
import { requireAdmin } from "@/lib/auth";

import { UsersManager } from "./_components/UsersManager";

export const metadata: Metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function parsePage(value: string | string[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 10_000);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const context = await requireAdmin();
  if (context.profile.role !== "master") redirect("/admin");

  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  // This server-only service starts with requireRole(["master"]), so reads
  // remain protected even when this URL is entered directly.
  const result = await listManagedUsers({ page, pageSize: PAGE_SIZE });

  if (result.pageCount > 0 && result.page > result.pageCount) {
    redirect(`/admin/users?page=${result.pageCount}`);
  }

  return <UsersManager page={result} />;
}
