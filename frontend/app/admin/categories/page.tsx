"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { Category, CategoryCreate } from "@/lib/api/types";
import { useCurrentStaff } from "@/lib/auth";

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const staff = useCurrentStaff();
  const canWrite = staff.data?.permissions.includes("catalogue:write") ?? false;
  const canPublish = staff.data?.permissions.includes("catalogue:publish") ?? false;
  const [error, setError] = useState<ApiClientError | null>(null);
  const categories = useQuery({
    queryKey: ["staff-categories"],
    queryFn: () => apiRequest<Category[]>("/api/v1/staff/categories"),
  });
  const create = useMutation({
    mutationFn: (payload: CategoryCreate) =>
      apiRequest<Category>("/api/v1/staff/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["staff-categories"] }),
    onError: (cause) => setError(cause instanceof ApiClientError ? cause : null),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      slug: String(data.get("slug") ?? ""),
      sort_order: 0,
      translations: [
        { locale: "vi", name: String(data.get("name_vi") ?? "") },
        { locale: "en", name: String(data.get("name_en") ?? "") },
      ],
    });
    event.currentTarget.reset();
  };
  const action = async (category: Category, verb: "publish" | "unpublish") => {
    if (!window.confirm(`${verb} ${category.slug}?`)) return;
    try {
      await apiRequest<Category>(`/api/v1/staff/categories/${category.id}/${verb}`, {
        method: "POST",
      });
      await queryClient.invalidateQueries({ queryKey: ["staff-categories"] });
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause : null);
    }
  };
  const edit = async (category: Category) => {
    const currentVi =
      category.translations.find((item) => item.locale === "vi")?.name ?? "";
    const currentEn =
      category.translations.find((item) => item.locale === "en")?.name ?? "";
    const nameVi = window.prompt("Vietnamese name", currentVi);
    if (nameVi === null) return;
    const nameEn = window.prompt("English name", currentEn);
    if (nameEn === null) return;
    try {
      await apiRequest<Category>(`/api/v1/staff/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          version: category.version,
          translations: [
            { locale: "vi", name: nameVi },
            { locale: "en", name: nameEn },
          ],
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ["staff-categories"] });
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause : null);
    }
  };

  return (
    <>
      <p className="font-mono text-eyebrow tracking-widest text-brand-green">
        Catalogue
      </p>
      <h1 className="mt-2 text-h1 font-semibold">Categories</h1>
      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-control border border-status-rejected/40 p-4"
        >
          {error.detail.code === "VERSION_CONFLICT"
            ? "This category changed elsewhere. Reload before editing."
            : error.message}{" "}
          <span className="font-mono text-data">
            Request ID: {error.detail.request_id}
          </span>
        </p>
      ) : null}
      {canWrite ? (
        <form
          onSubmit={submit}
          className="mt-8 grid gap-4 rounded-card border border-line bg-paper-raised p-5 md:grid-cols-4"
        >
          <CategoryField name="slug" label="Slug" />
          <CategoryField name="name_vi" label="Vietnamese name" />
          <CategoryField name="name_en" label="English name" />
          <button
            type="submit"
            className="min-h-11 self-end rounded-control bg-brand-green px-4 py-2 font-medium text-white"
          >
            Add draft
          </button>
        </form>
      ) : null}
      <div className="mt-8 overflow-x-auto rounded-card border border-line bg-paper-raised">
        <table className="w-full text-left">
          <thead className="border-b border-line bg-paper-sunk">
            <tr>
              <th className="p-4">Slug</th>
              <th className="p-4">Vietnamese</th>
              <th className="p-4">English</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.data?.map((category) => (
              <tr key={category.id} className="border-b border-line last:border-0">
                <td className="p-4 font-mono text-data">{category.slug}</td>
                <td className="p-4">
                  {category.translations.find((item) => item.locale === "vi")?.name}
                </td>
                <td className="p-4">
                  {category.translations.find((item) => item.locale === "en")?.name}
                </td>
                <td className="p-4">
                  <StatusBadge status={category.status} />
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => void edit(category)}
                        className="underline"
                      >
                        Edit
                      </button>
                    ) : null}
                    {canPublish ? (
                      <button
                        type="button"
                        className="underline"
                        onClick={() =>
                          void action(
                            category,
                            category.status === "published" ? "unpublish" : "publish",
                          )
                        }
                      >
                        {category.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CategoryField({
  name,
  label,
}: {
  readonly name: string;
  readonly label: string;
}) {
  return (
    <label className="font-medium">
      {label}
      <input
        required
        name={name}
        className="mt-2 w-full rounded-control border border-line-strong px-3 py-2"
      />
    </label>
  );
}
