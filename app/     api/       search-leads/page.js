"use client";

import { useState } from "react";

function downloadCSV(rows) {
  if (!rows || rows.length === 0) return;

  const headers = [
    "Business Name",
    "Category",
    "Address",
    "Phone",
    "Has Website",
    "Website",
    "Google Maps URL",
    "Business Status",
    "Place ID"
  ];

  const escapeCell = (value) => {
    const stringValue = String(value ?? "");
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.name,
        row.category,
        row.address,
        row.phone,
        row.hasWebsite ? "Yes" : "No",
        row.website,
        row.mapsUrl,
        row.businessStatus,
        row.placeId
      ]
        .map(escapeCell)
        .join(",")
    )
  ];

  const blob = new Blob([csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "leads.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [form, setForm] = useState({
    keyword: "",
    city: "Cairo",
    country: "Egypt",
    maxResults: 10,
    noWebsiteOnly: false
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [queryLabel, setQueryLabel] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);
    setQueryLabel("");

    try {
      const response = await fetch("/api/search-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          keyword: form.keyword,
          city: form.city,
          country: form.country,
          maxResults: Number(form.maxResults),
          noWebsiteOnly: form.noWebsiteOnly
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch leads.");
      }

      setResults(data.results || []);
      setQueryLabel(data.query || "");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="hero">
        <h1>Google Maps Lead Finder</h1>
        <p>
          Search for brands and stores, check whether they have a website, and
          export the results to CSV. This is a clean starter version you can
          deploy on GitHub and Vercel.
        </p>
      </section>

      <section className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="keyword">Business Keyword</label>
              <input
                id="keyword"
                name="keyword"
                type="text"
                placeholder="perfume, clinic, gym, restaurant"
                value={form.keyword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="Cairo"
                value={form.city}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="country">Country</label>
              <input
                id="country"
                name="country"
                type="text"
                placeholder="Egypt"
                value={form.country}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label htmlFor="maxResults">Max Results</label>
              <select
                id="maxResults"
                name="maxResults"
                value={form.maxResults}
                onChange={handleChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="actions">
              <button className="button button-primary" type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search Leads"}
              </button>

              <button
                className="button button-secondary"
                type="button"
                onClick={() => downloadCSV(results)}
                disabled={results.length === 0}
              >
                Export CSV
              </button>
            </div>
          </div>

          <label className="checkbox-wrap">
            <input
              type="checkbox"
              name="noWebsiteOnly"
              checked={form.noWebsiteOnly}
              onChange={handleChange}
            />
            Show only leads with no website
          </label>
        </form>

        {loading && <div className="status">Loading results...</div>}
        {error && <div className="error">{error}</div>}
      </section>

      <section className="results-wrap">
        <div className="results-topbar">
          <div>
            <h2 className="results-title">Results</h2>
            {queryLabel ? (
              <div className="status">
                Search query: <strong>{queryLabel}</strong>
              </div>
            ) : null}
          </div>

          {results.length > 0 ? (
            <div className="row">
              <span className="badge badge-yes">{results.length} leads found</span>
            </div>
          ) : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th>
                <th>Category</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Website</th>
                <th>Maps</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td className="empty" colSpan="7">
                    No results yet. Search for a business type first.
                  </td>
                </tr>
              ) : (
                results.map((item) => (
                  <tr key={item.placeId}>
                    <td>
                      <strong>{item.name}</strong>
                      <div className="small">Place ID: {item.placeId}</div>
                    </td>

                    <td>{item.category || "N/A"}</td>

                    <td>{item.address || "N/A"}</td>

                    <td>{item.phone || "N/A"}</td>

                    <td>
                      {item.hasWebsite ? (
                        <div>
                          <span className="badge badge-yes">Has Website</span>
                          <div className="small">
                            <a
                              className="link"
                              href={item.website}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Website
                            </a>
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-no">No Website</span>
                      )}
                    </td>

                    <td>
                      {item.mapsUrl ? (
                        <a
                          className="link"
                          href={item.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Maps
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </td>

                    <td>{item.businessStatus || "N/A"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="footer-note">
          This version is the MVP. It already works for searching and checking
          whether a business has a website. Later, you can add database saving,
          AI outreach messages, website quality checks, WhatsApp templates, and
          CRM lead statuses.
        </p>
      </section>
    </main>
  );
}
