"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createFirmService,
  deactivateFirmService,
  fetchFirmServices,
  fetchSession,
  isFirmUser,
  updateFirmService,
  type FirmServicePackage,
  type FirmServicesData,
} from "@/lib/backend-api";

function formatCurrencyCents(value: number): string {
  return `$${(value / 100).toLocaleString()}`;
}

export default function FirmServicesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FirmServicesData | null>(null);
  const [services, setServices] = useState<FirmServicePackage[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [tags, setTags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    description: string;
    category: string;
    timeline: string;
    priceMin: string;
    priceMax: string;
    tags: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const session = await fetchSession();
      if (cancelled) return;

      if (!isFirmUser(session)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const result = await fetchFirmServices();
      if (cancelled) return;

      if (!result) {
        setServices([]);
      } else {
        setData(result);
        setServices(result.services);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const limitReached = useMemo(() => {
    const sub = data?.subscription;
    if (!sub) return false;
    return sub.serviceLimit >= 0 && sub.servicesUsed >= sub.serviceLimit;
  }, [data]);

  async function handleCreateService() {
    if (!title.trim() || !timeline.trim() || !priceMin || !priceMax) {
      setError("Title, timeline, and min/max price are required.");
      return;
    }

    setError(null);
    setSaving(true);
    const result = await createFirmService({
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      priceMin: Number(priceMin),
      priceMax: Number(priceMax),
      timeline: timeline.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setSaving(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    const fresh = await fetchFirmServices();
    if (fresh) {
      setData(fresh);
      setServices(fresh.services);
    } else {
      setServices((curr) => [result.data.services[0], ...curr]);
    }

    setTitle("");
    setDescription("");
    setCategory("");
    setPriceMin("");
    setPriceMax("");
    setTimeline("");
    setTags("");
  }

  function startEdit(service: FirmServicePackage) {
    setEditingId(service.id);
    setEditDraft({
      title: service.title,
      description: service.description ?? "",
      category: service.category ?? "",
      timeline: service.timeline ?? "",
      priceMin: String(service.priceMin / 100),
      priceMax: String(service.priceMax / 100),
      tags: service.tags.join(", "),
    });
    setError(null);
  }

  async function handleSaveEdit(serviceId: string) {
    if (!editDraft) return;
    if (
      !editDraft.title.trim() ||
      !editDraft.timeline.trim() ||
      !editDraft.priceMin ||
      !editDraft.priceMax
    ) {
      setError("Title, timeline, and min/max price are required.");
      return;
    }

    const result = await updateFirmService(serviceId, {
      title: editDraft.title.trim(),
      description: editDraft.description.trim() || null,
      category: editDraft.category.trim() || null,
      timeline: editDraft.timeline.trim() || null,
      priceMin: Number(editDraft.priceMin),
      priceMax: Number(editDraft.priceMax),
      tags: editDraft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    setServices((curr) =>
      curr.map((service) =>
        service.id === serviceId ? result.service : service,
      ),
    );
    setEditingId(null);
    setEditDraft(null);
  }

  async function handleDeactivate(serviceId: string) {
    const result = await deactivateFirmService(serviceId);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setServices((curr) =>
      curr.map((service) =>
        service.id === serviceId ? result.service : service,
      ),
    );
    const fresh = await fetchFirmServices();
    if (fresh) setData(fresh);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading services...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-950">Firm services</h1>
          <p className="mt-2 text-sm text-slate-600">
            This page is only available to firm users.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Log in
            </Link>
            <Link
              href="/onboarding"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Onboarding
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Service Packages</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create and manage your firm’s public offerings.
        </p>
        {data?.subscription && (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Plan: <span className="font-semibold">{data.subscription.plan}</span> ·{" "}
            Services used:{" "}
            <span className="font-semibold">{data.subscription.servicesUsed}</span>
            {data.subscription.serviceLimit >= 0
              ? ` / ${data.subscription.serviceLimit}`
              : " / unlimited"}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Add a service package</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Service title"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (e.g. Strategy)"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="Timeline (e.g. 4-6 weeks)"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min="0"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Min price (USD)"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min="0"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Max price (USD)"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="sm:col-span-2 min-h-[110px] rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleCreateService}
          disabled={saving || limitReached}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {limitReached
            ? "Service limit reached"
            : saving
              ? "Saving..."
              : "Add service"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Your services</h2>
        {services.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No service packages yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {services.map((service) => (
              <li key={service.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {editingId === service.id && editDraft ? (
                      <div className="space-y-2">
                        <input
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, title: e.target.value }
                                : prev,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                        />
                        <input
                          value={editDraft.category}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, category: e.target.value }
                                : prev,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          placeholder="Category"
                        />
                        <input
                          value={editDraft.timeline}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, timeline: e.target.value }
                                : prev,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          placeholder="Timeline"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editDraft.priceMin}
                            onChange={(e) =>
                              setEditDraft((prev) =>
                                prev
                                  ? { ...prev, priceMin: e.target.value }
                                  : prev,
                              )
                            }
                            className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                            placeholder="Min price"
                          />
                          <input
                            type="number"
                            min="0"
                            value={editDraft.priceMax}
                            onChange={(e) =>
                              setEditDraft((prev) =>
                                prev
                                  ? { ...prev, priceMax: e.target.value }
                                  : prev,
                              )
                            }
                            className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                            placeholder="Max price"
                          />
                        </div>
                        <input
                          value={editDraft.tags}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, tags: e.target.value } : prev,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          placeholder="Tags"
                        />
                        <textarea
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, description: e.target.value }
                                : prev,
                            )
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                          placeholder="Description"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-slate-900">{service.title}</p>
                        <p className="text-sm text-slate-600">
                          {service.category ?? "Uncategorized"} ·{" "}
                          {service.timeline ?? "Timeline not set"}
                          {!service.isActive && (
                            <span className="ml-2 text-xs text-slate-500">(Inactive)</span>
                          )}
                        </p>
                        {service.description && (
                          <p className="mt-1 text-sm text-slate-600">
                            {service.description}
                          </p>
                        )}
                      </>
                    )}
                    {editingId !== service.id && service.tags.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500">{service.tags.join(" · ")}</p>
                    )}
                  </div>
                  <div className="text-right text-sm font-medium text-slate-900">
                    {formatCurrencyCents(service.priceMin)} -{" "}
                    {formatCurrencyCents(service.priceMax)}
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      {editingId === service.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(service.id)}
                            className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft(null);
                            }}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(service)}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          {service.isActive && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(service.id)}
                              className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Deactivate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

