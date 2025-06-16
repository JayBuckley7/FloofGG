import React, { useEffect, useState } from "react";

interface OfflineBook {
  id: string;
  name: string;
  content: string;
}

interface Translation {
  bookId: string;
  text: string;
  translation: string;
}

interface Highlight {
  bookId: string;
  text: string;
}

export default function OfflineLibrary() {
  const [books, setBooks] = useState<OfflineBook[]>([]);
  const [current, setCurrent] = useState<OfflineBook | null>(null);
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("offlineLibrary_books");
    if (stored) {
      setBooks(JSON.parse(stored));
    }
  }, []);

  function saveBooks(updated: OfflineBook[]) {
    setBooks(updated);
    localStorage.setItem("offlineLibrary_books", JSON.stringify(updated));
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result?.toString() ?? "";
      const newBook: OfflineBook = {
        id: crypto.randomUUID(),
        name: file.name,
        content,
      };
      saveBooks([...books, newBook]);
    };
    reader.readAsText(file);
  }

  async function translate() {
    if (!current) return;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: current.content }),
      });
      const data = await res.json();
      storeTranslation(data.translation);
    } catch {
      // Fallback demo translation
      storeTranslation(current.content.split("").reverse().join(""));
    }
  }

  function storeTranslation(result: string) {
    if (!current) return;
    setTranslation(result);
    const translations: Translation[] = JSON.parse(
      localStorage.getItem("offlineLibrary_translations") ?? "[]",
    );
    translations.push({
      bookId: current.id,
      text: current.content,
      translation: result,
    });
    localStorage.setItem(
      "offlineLibrary_translations",
      JSON.stringify(translations),
    );
  }

  function saveHighlight() {
    if (!current) return;
    const selection = window.getSelection()?.toString();
    if (!selection) return;
    const highlights: Highlight[] = JSON.parse(
      localStorage.getItem("offlineLibrary_highlights") ?? "[]",
    );
    highlights.push({ bookId: current.id, text: selection });
    localStorage.setItem(
      "offlineLibrary_highlights",
      JSON.stringify(highlights),
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Offline Library</h1>
      <input type="file" onChange={onUpload} />
      <ul className="space-y-2">
        {books.map((b) => (
          <li key={b.id}>
            <button
              className="text-blue-600 underline"
              onClick={() => {
                setCurrent(b);
                setTranslation("");
              }}
            >
              {b.name}
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <div>
          <h2 className="text-lg font-semibold mt-4">{current.name}</h2>
          <pre
            className="whitespace-pre-wrap border p-2 mt-2"
            onMouseUp={saveHighlight}
          >
            {current.content}
          </pre>
          <button className="mt-2 px-2 py-1 bg-gray-200" onClick={translate}>
            Translate
          </button>
          {translation && (
            <pre className="whitespace-pre-wrap border p-2 mt-2 bg-gray-50">
              {translation}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
