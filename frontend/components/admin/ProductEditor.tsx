"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { StatusBadge } from "./StatusBadge";
import { ApiClientError, apiBaseUrl, apiRequest, cookie } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type { Category, Media, Product } from "@/lib/api/types";

type Specification = components["schemas"]["SpecificationInput"];

interface ProductEditorProps {
  readonly product: Product;
  readonly categories: Category[];
  readonly media: Media[];
  readonly canWrite: boolean;
  readonly canPublish: boolean;
}

function translation(product: Product, locale: "vi" | "en") {
  return product.translations.find((item) => item.locale === locale);
}

export function ProductEditor({
  product,
  categories,
  media,
  canWrite,
  canPublish,
}: ProductEditorProps) {
  const queryClient = useQueryClient();
  const [selectedCategories, setSelectedCategories] = useState(product.category_ids);
  const [specifications, setSpecifications] = useState<Specification[]>(
    product.specifications,
  );
  const [error, setError] = useState<ApiClientError | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff-product", product.id] }),
      queryClient.invalidateQueries({ queryKey: ["staff-products"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-media", product.id] }),
    ]);
  };
  const execute = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause : null);
    } finally {
      setSaving(false);
    }
  };

  const saveProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void execute(
      () =>
        apiRequest<Product>(`/api/v1/staff/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            version: product.version,
            sku: String(data.get("sku") ?? ""),
            slug: String(data.get("slug") ?? ""),
            barcode: String(data.get("barcode") ?? "") || null,
            oem_available: data.get("oem_available") === "on",
            featured: data.get("featured") === "on",
            category_ids: selectedCategories,
            translations: [
              {
                locale: "vi",
                name: String(data.get("name_vi") ?? ""),
                summary: String(data.get("summary_vi") ?? ""),
                description: String(data.get("description_vi") ?? "") || null,
                meta_title: String(data.get("meta_title_vi") ?? "") || null,
                meta_description: String(data.get("meta_description_vi") ?? "") || null,
              },
              {
                locale: "en",
                name: String(data.get("name_en") ?? ""),
                summary: String(data.get("summary_en") ?? ""),
                description: String(data.get("description_en") ?? "") || null,
                meta_title: String(data.get("meta_title_en") ?? "") || null,
                meta_description: String(data.get("meta_description_en") ?? "") || null,
              },
            ],
          }),
        }),
      "Product saved.",
    );
  };

  const saveSpecifications = () =>
    execute(
      () =>
        apiRequest<Product>(`/api/v1/staff/products/${product.id}/specifications`, {
          method: "PUT",
          body: JSON.stringify({ version: product.version, specifications }),
        }),
      "Specifications saved.",
    );

  const primary = media.find(
    (item) => item.is_primary && item.approval_status === "approved",
  );
  const requirements = [
    {
      label: "Vietnamese name and summary",
      met: Boolean(
        translation(product, "vi")?.name && translation(product, "vi")?.summary,
      ),
    },
    {
      label: "English name and summary",
      met: Boolean(
        translation(product, "en")?.name && translation(product, "en")?.summary,
      ),
    },
    { label: "At least one category", met: product.category_ids.length > 0 },
    { label: "At least one specification", met: product.specifications.length > 0 },
    { label: "Approved primary image", met: Boolean(primary) },
  ];

  return (
    <>
      <Link href="/admin/products" className="text-brand-dark underline">
        ← Products
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <StatusBadge status={product.status} />
            <span className="font-mono text-data text-ink-faint">
              Version {product.version}
            </span>
          </div>
          <h1 className="mt-3 text-h1 font-semibold">
            {translation(product, "en")?.name ?? product.slug}
          </h1>
        </div>
        {canPublish ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              const verb = product.status === "published" ? "unpublish" : "publish";
              if (!window.confirm(`${verb} this product?`)) return;
              void execute(
                () =>
                  apiRequest<Product>(`/api/v1/staff/products/${product.id}/${verb}`, {
                    method: "POST",
                  }),
                `Product ${verb}ed.`,
              );
            }}
            className="min-h-11 rounded-control bg-brand-green px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {product.status === "published" ? "Unpublish" : "Publish"}
          </button>
        ) : null}
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-5 rounded-control border border-status-accepted/40 p-3"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-control border border-status-rejected/40 p-4"
        >
          <p>
            {error.detail.code === "VERSION_CONFLICT"
              ? "This product changed elsewhere. Reload before saving."
              : error.message}
          </p>
          {error.detail.field_errors?.requirements ? (
            <ul className="mt-2 list-disc pl-5">
              {error.detail.field_errors.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 font-mono text-data">
            Request ID: {error.detail.request_id}
          </p>
        </div>
      ) : null}

      <section className="mt-8 rounded-card border border-line bg-paper-raised p-6">
        <h2 className="text-h2 font-semibold">Publication requirements</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {requirements.map((item) => (
            <li key={item.label}>
              <span aria-hidden="true">{item.met ? "✓" : "○"}</span> {item.label}:{" "}
              {item.met ? "complete" : "missing"}
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={saveProduct} className="mt-8">
        <fieldset disabled={!canWrite || saving}>
          <div className="grid gap-5 rounded-card border border-line bg-paper-raised p-6 sm:grid-cols-2">
            <Input label="SKU" name="sku" defaultValue={product.sku} required />
            <Input label="Slug" name="slug" defaultValue={product.slug} required />
            <Input
              label="Barcode"
              name="barcode"
              defaultValue={product.barcode ?? ""}
            />
            <div className="flex items-end gap-5 pb-2">
              <label>
                <input
                  name="oem_available"
                  type="checkbox"
                  defaultChecked={product.oem_available}
                />{" "}
                OEM available
              </label>
              <label>
                <input
                  name="featured"
                  type="checkbox"
                  defaultChecked={product.featured}
                />{" "}
                Featured
              </label>
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ProductTranslationFields
              locale="vi"
              title="Vietnamese"
              product={product}
            />
            <ProductTranslationFields locale="en" title="English" product={product} />
          </div>
          <fieldset className="mt-6 rounded-card border border-line bg-paper-raised p-6">
            <legend className="px-2 font-medium">Categories</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <label key={category.id}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={(event) =>
                      setSelectedCategories((current) =>
                        event.target.checked
                          ? [...current, category.id]
                          : current.filter((id) => id !== category.id),
                      )
                    }
                  />{" "}
                  {category.translations.find((item) => item.locale === "en")?.name ??
                    category.slug}
                </label>
              ))}
            </div>
          </fieldset>
          {canWrite ? (
            <button
              type="submit"
              className="min-h-11 mt-6 rounded-control bg-brand-green px-5 py-3 font-medium text-white"
            >
              Save product
            </button>
          ) : null}
        </fieldset>
      </form>

      <SpecificationEditor
        specifications={specifications}
        setSpecifications={setSpecifications}
        onSave={() => void saveSpecifications()}
        disabled={!canWrite || saving}
      />
      <MediaEditor
        product={product}
        media={media}
        disabled={!canWrite || saving}
        onError={setError}
        onChanged={refresh}
      />
    </>
  );
}

function Input({
  label,
  name,
  defaultValue,
  required = false,
}: {
  readonly label: string;
  readonly name: string;
  readonly defaultValue: string;
  readonly required?: boolean;
}) {
  return (
    <label className="font-medium">
      {label}
      <input
        required={required}
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-control border border-line-strong px-3 py-2"
      />
    </label>
  );
}

function ProductTranslationFields({
  locale,
  title,
  product,
}: {
  readonly locale: "vi" | "en";
  readonly title: string;
  readonly product: Product;
}) {
  const value = translation(product, locale);
  return (
    <fieldset className="rounded-card border border-line bg-paper-raised p-6">
      <legend className="px-2 font-medium">{title}</legend>
      <Input
        label="Name"
        name={`name_${locale}`}
        defaultValue={value?.name ?? ""}
        required
      />
      <Area
        label="Summary"
        name={`summary_${locale}`}
        defaultValue={value?.summary ?? ""}
        required
      />
      <Area
        label="Description"
        name={`description_${locale}`}
        defaultValue={value?.description ?? ""}
      />
      <Input
        label="SEO title"
        name={`meta_title_${locale}`}
        defaultValue={value?.meta_title ?? ""}
      />
      <Area
        label="SEO description"
        name={`meta_description_${locale}`}
        defaultValue={value?.meta_description ?? ""}
      />
    </fieldset>
  );
}

function Area({
  label,
  name,
  defaultValue,
  required = false,
}: {
  readonly label: string;
  readonly name: string;
  readonly defaultValue: string;
  readonly required?: boolean;
}) {
  return (
    <label className="mt-4 block font-medium">
      {label}
      <textarea
        required={required}
        name={name}
        defaultValue={defaultValue}
        className="mt-2 min-h-24 w-full rounded-control border border-line-strong px-3 py-2"
      />
    </label>
  );
}

function SpecificationEditor({
  specifications,
  setSpecifications,
  onSave,
  disabled,
}: {
  readonly specifications: Specification[];
  readonly setSpecifications: (value: Specification[]) => void;
  readonly onSave: () => void;
  readonly disabled: boolean;
}) {
  const update = (index: number, changes: Partial<Specification>) =>
    setSpecifications(
      specifications.map((item, current) =>
        current === index ? { ...item, ...changes } : item,
      ),
    );
  return (
    <section className="mt-10 rounded-card border border-line bg-paper-raised p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 font-semibold">Specifications</h2>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setSpecifications([
              ...specifications,
              {
                key: "",
                value: "",
                unit: null,
                sort_order: specifications.length,
                is_highlighted: false,
                translations: [
                  { locale: "vi", label: "" },
                  { locale: "en", label: "" },
                ],
              },
            ])
          }
          className="min-h-11 rounded-control border border-line-strong px-3 py-2"
        >
          Add row
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {specifications.map((specification, index) => (
          <div
            key={`${specification.key}-${index}`}
            className="grid gap-3 rounded-control bg-paper-sunk p-4 md:grid-cols-6"
          >
            <SpecInput
              label="Key"
              value={specification.key}
              onChange={(value) => update(index, { key: value })}
            />
            <SpecInput
              label="Value"
              value={specification.value}
              onChange={(value) => update(index, { value })}
            />
            <SpecInput
              label="Unit"
              value={specification.unit ?? ""}
              onChange={(value) => update(index, { unit: value || null })}
            />
            <SpecInput
              label="Nhãn VI"
              value={
                specification.translations.find((item) => item.locale === "vi")
                  ?.label ?? ""
              }
              onChange={(value) =>
                update(index, {
                  translations: specification.translations.map((item) =>
                    item.locale === "vi" ? { ...item, label: value } : item,
                  ),
                })
              }
            />
            <SpecInput
              label="Label EN"
              value={
                specification.translations.find((item) => item.locale === "en")
                  ?.label ?? ""
              }
              onChange={(value) =>
                update(index, {
                  translations: specification.translations.map((item) =>
                    item.locale === "en" ? { ...item, label: value } : item,
                  ),
                })
              }
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setSpecifications(
                  specifications.filter((_, current) => current !== index),
                )
              }
              className="min-h-11 self-end rounded-control border border-status-rejected/40 px-3 py-2 text-status-rejected"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onSave}
        className="min-h-11 mt-5 rounded-control bg-brand-green px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Save specifications
      </button>
    </section>
  );
}

function SpecInput({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="text-data font-medium">
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-control border border-line-strong px-2 py-2"
      />
    </label>
  );
}

function MediaEditor({
  product,
  media,
  disabled,
  onError,
  onChanged,
}: {
  readonly product: Product;
  readonly media: Media[];
  readonly disabled: boolean;
  readonly onError: (error: ApiClientError | null) => void;
  readonly onChanged: () => Promise<void>;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    try {
      onError(null);
      await action();
      await onChanged();
    } catch (cause) {
      onError(cause instanceof ApiClientError ? cause : null);
    }
  };
  const upload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const request = new XMLHttpRequest();
    request.open("POST", `${apiBaseUrl()}/api/v1/staff/products/${product.id}/media`);
    request.withCredentials = true;
    const csrf = cookie("ug_csrf");
    if (csrf) request.setRequestHeader("X-CSRF-Token", decodeURIComponent(csrf));
    request.upload.onprogress = (uploadEvent) => {
      if (uploadEvent.lengthComputable)
        setProgress(Math.round((uploadEvent.loaded * 100) / uploadEvent.total));
    };
    request.onload = () => {
      setProgress(null);
      if (request.status >= 200 && request.status < 300) {
        form.reset();
        void onChanged();
      } else {
        const body = JSON.parse(
          request.responseText,
        ) as components["schemas"]["ErrorEnvelope"];
        onError(new ApiClientError(request.status, body.error));
      }
    };
    request.onerror = () => {
      setProgress(null);
      onError(
        new ApiClientError(0, {
          code: "UPLOAD_FAILED",
          message: "Upload failed.",
          field_errors: {},
          request_id: "unavailable",
        }),
      );
    };
    request.send(data);
  };
  const reorder = (index: number, direction: -1 | 1) => {
    const next = [...media];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    void run(() =>
      apiRequest(`/api/v1/staff/products/${product.id}/media/reorder`, {
        method: "POST",
        body: JSON.stringify({ media_ids: next.map((item) => item.id) }),
      }),
    );
  };
  return (
    <section className="mt-10 rounded-card border border-line bg-paper-raised p-6">
      <h2 className="text-h2 font-semibold">Images</h2>
      <p className="mt-2 text-body text-ink-muted">
        JPEG, PNG or WebP · up to 10 MiB · maximum five. Uploads remain pending until
        explicitly approved.
      </p>
      {!disabled ? (
        <form
          onSubmit={upload}
          className="mt-5 grid gap-4 rounded-control bg-paper-sunk p-4 md:grid-cols-4"
        >
          <label className="font-medium">
            Image
            <input
              required
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 block w-full"
            />
          </label>
          <Input label="Alt text VI" name="alt_vi" defaultValue="" required />
          <Input label="Alt text EN" name="alt_en" defaultValue="" required />
          <Input
            label="Approval source"
            name="source_reference"
            defaultValue=""
            required
          />
          <button
            type="submit"
            className="min-h-11 rounded-control bg-brand-green px-4 py-2 font-medium text-white"
          >
            Upload
          </button>
          {progress !== null ? (
            <progress aria-label="Upload progress" max={100} value={progress}>
              {progress}%
            </progress>
          ) : null}
        </form>
      ) : null}
      <ul className="mt-6 space-y-4">
        {media.map((item, index) => {
          const thumbnail = item.variants[0];
          return (
            <li
              key={item.id}
              className="grid gap-4 rounded-control border border-line p-4 md:grid-cols-[120px_1fr_auto]"
            >
              <div className="flex h-24 items-center justify-center bg-paper-sunk">
                {thumbnail ? (
                  // Runtime media host; see docs/adr/0004.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${apiBaseUrl()}/api/v1/staff/products/${product.id}/media/${item.id}/variants/${thumbnail.name}`}
                    alt={item.alt_en}
                    width={thumbnail.width}
                    height={thumbnail.height}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>
              <div>
                <p className="font-medium">{item.original_filename}</p>
                <p className="text-data text-ink-muted">
                  {item.width}×{item.height} · {item.approval_status}{" "}
                  {item.is_primary ? "· primary" : ""}
                </p>
                <p className="mt-1 text-data">
                  VI: {item.alt_vi}
                  <br />
                  EN: {item.alt_en}
                </p>
                <a
                  className="text-data text-brand-dark underline"
                  href={`${apiBaseUrl()}/api/v1/staff/products/${product.id}/media/${item.id}/original`}
                >
                  Download private original
                </a>
              </div>
              {!disabled ? (
                <div className="flex flex-wrap content-start gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => reorder(index, -1)}
                    className="min-h-11 rounded-control border px-2 py-1"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === media.length - 1}
                    onClick={() => reorder(index, 1)}
                    className="min-h-11 rounded-control border px-2 py-1"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void run(() =>
                        apiRequest(
                          `/api/v1/staff/products/${product.id}/media/${item.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              approval_status: "approved",
                              is_primary: true,
                            }),
                          },
                        ),
                      )
                    }
                    className="min-h-11 rounded-control border px-2 py-1"
                  >
                    Approve + primary
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this image?"))
                        void run(() =>
                          apiRequest(
                            `/api/v1/staff/products/${product.id}/media/${item.id}`,
                            { method: "DELETE" },
                          ),
                        );
                    }}
                    className="min-h-11 rounded-control border border-status-rejected/40 px-2 py-1 text-status-rejected"
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
