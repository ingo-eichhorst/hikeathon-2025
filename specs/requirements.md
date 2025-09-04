# Hackathon Web-App Requirements  
Version: Draft 0.9  
Event: HIKEathon @ Hochschule Nordhausen x IONOS  
Date: 2025

---

## 1. Zielsetzung
- Bereitstellung einer **reinen Frontend-Web-App** für Hackathon-Teilnehmer:innen.  
- Funktionen:
  - Chat mit IONOS Model Hub (Text-Modelle + RAG + Tools).
  - Bildgenerierung mit verfügbaren Image-Modellen.
  - Abruf von Hackathon-Infos (Zeitplan, Regeln, Challenges, Methodik).
  - Basis-Einstellungen (Theme, Key-Eingabe, ggf. System-Prompt-Anpassung).
- Fokus auf **einfache Bedienbarkeit**, bekannte UX (ähnlich ChatGPT), und **Dark/Light Mode**.  
- Branding: Logos von **Hochschule Nordhausen**, **IONOS**, **HIKEathon**.

---

## 2. User Journey
1. **Login:**  
   - Eingabe eines 8-stelligen Team-Codes.  
   - App entschlüsselt daraus den im Build hinterlegten Token (AES-GCM, PBKDF2/Argon2).  
   - Token bleibt **48h gültig** in `sessionStorage`.  
   - Logout jederzeit möglich.  
   - Alle Teammitglieder teilen denselben Key.

2. **Navigation (4 Tabs):**
   - **Infos:** Hackathon-Zeitplan, Regeln, Challenges, Methodik (öffentlich via Google Docs).  
   - **Chat:** Gespräch mit Modell + RAG + Tools.  
   - **Bilder:** Text-to-Image Generierung.  
   - **Einstellungen:** Theme, System-Prompt anpassen, ggf. Sprache.

3. **Anwendungsdauer:**  
   - Hackathon läuft 48h → Token TTL = 3 Tage.  
   - Nach Sessionverlust erneute Key-Eingabe nötig.

---

## 3. Funktionen

### 3.1 Chat
- OpenAI-kompatible API: `POST /v1/chat/completions`.
- Streaming (SSE/Fetch) mit **Token-by-Token Anzeige**.  
- Features:
  - „Stop Generating“-Button.  
  - Bearbeiten & erneutes Absenden einer früheren Anfrage.  
  - Datei-Anhänge (PDF, PNG, TXT) → Inhalte als Kontext einbetten.  
  - System-Prompt: Default von Orga vorgegeben, aber in Settings anpassbar.  
  - Kontext-Fenster-Anzeige (verbleibende Tokens je Modell).  

### 3.2 Bildgenerierung
- OpenAI-kompatible API: `POST /v1/images/generations`.  
- Felder: Prompt, Modell-Auswahl.  
- Optional: Bild-to-Bild nur falls Modelle es explizit unterstützen (z. B. Stable Diffusion mit Inpainting, derzeit nicht im IONOS-Hub dokumentiert).  

### 3.3 RAG (Hackathon-Infos)
- Quelle: Google Docs → „Veröffentlichen im Web“ (HTML/Text).  
- Kein Chunking (1 Dokument = 1 Kontext).  
- Mit jeder Chat-Anfrage aktueller Fetch.  
- Texte sind kurz (ca. 10 Seiten).  
- Eingebettet in Prompt als Tool-Use.  

### 3.4 Tools / Agentik
- **Websuche (API-basiert):**
  - Primär Brave Search API oder Tavily API.  
  - Key im SessionStorage gespeichert (wie Model-Key).  
  - Fallback: Wenn CORS blockiert → Hinweis „Öffne Link manuell“.  
- **URL-Fetcher:**  
  - Lädt HTML/Text-Daten (CORS permitting).  
  - Konvertiert HTML zu Markdown für Modell.

### 3.5 Einstellungen
- Dark-/Light-Mode.  
- Logos (HS Nordhausen, IONOS, HIKEathon).  
- Sprache: DE/EN Umschaltbar.  
- System-Prompt: anpassbar.  

---

## 4. Technische Rahmenbedingungen

### 4.1 Architektur
- Reines Frontend (SPA, z. B. Nuxt, React, Vite).  
- Keine Backend-Komponente.  
- Tokens in Build-Artefakt verschlüsselt.  
- Entschlüsselung per 8-stelligem Team-Key.  

### 4.2 API (IONOS Model Hub)
- Base URL (Berlin DC): `https://openai.inference.de-txl.ionos.com/v1`.  
- Endpunkte:  
  - `/chat/completions`  
  - `/images/generations`  
  - `/embeddings`  
  - `/models`  
- Auth: `Authorization: Bearer <token>`.  
- Streaming via `stream: true`.  
- **Rate Limits:**  
  - 5 RPS base, 10 RPS burst.  
  - Image: 10/min base, 20/min burst.  
  - HTTP 429 + Retry-After Header bei Limit-Überschreitung.  

### 4.3 Sicherheit
- Tokens verschlüsselt im Build (AES-GCM, Salt/IV pro Token).  
- Key-Derivation aus 8-stelligem Code (PBKDF2/Argon2).  
- Speicherung ausschließlich in `sessionStorage`.  
- Kein Git-Repo-Leak (nur in Build-Pipeline eingebettet).  

### 4.4 Telemetrie & Orga-Features
- **Optional Backend-App** (schlank, Orga-only):  
  - Anzeige Team-Nutzung (Token-Zähler, Requests, Errors).  
  - Versand von Orga-Nachrichten an alle Clients.  
  - Broadcast-Banner („Regeln geändert“, „Noch 2h bis Deadline“).  
  - Countdown bis Abgabe.  

---

## 5. UX / UI
- Modern, clean, angelehnt an HIKEathon-Design.  
- Responsive: Desktop, Tablet, Smartphone.  
- Tabs statt Swipe/Gesten (klassische ChatGPT-UX).  
- Kein unnötiges Animations-Ballast.  
- Farbschema: Dark/Light Mode.  

---

## 6. Non-Goals
- Kein Backend-Proxy für Token-Brokerage.  
- Kein persistentes User-Tracking jenseits Telemetrie.  
- Kein Live-Collaboration-Feature (z. B. Shared Sessions).  
- Keine Revocation einzelner Tokens während Event.  

---

## 7. Offene Punkte
- **CORS-Support** der IONOS-Endpunkte muss in einem Testlauf verifiziert werden.  
- Auswahl finaler Suchanbieter (Brave vs. Tavily) nach Preis/Limit/Key-Handling.  
- Technologiestack: React/Next.js, Vue/Nuxt oder Vanilla-Vite noch zu entscheiden.  
- Telemetrie-Backend: zu definieren (z. B. Supabase, Firebase, kleiner Node-Server).  

---
