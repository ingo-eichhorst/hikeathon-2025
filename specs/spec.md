# Hackathon Web-App – Technical Specification  
Event: HIKEathon @ Hochschule Nordhausen x IONOS  
Date: 2025-09  
Version: 1.0

---

## 1. Architekturübersicht
- **Frontend:** Nuxt 3 (SPA, `ssr: false`), Deployment via GitHub Pages.  
- **Backend:** Supabase (Postgres + Edge Functions).  
  - Aufgaben: Token-Entschlüsselung/Validierung, Proxy zu IONOS Model Hub + Websuche, Telemetrie, To-Do-Management, Broadcast/Countdown.  
- **Datenfluss:**  
  1. Team gibt 8-stelligen Key ein → Edge Function validiert.  
  2. Entsprechender IONOS-Token wird genutzt, um Requests weiterzureichen.  
  3. Telemetrie wird pro Request aggregiert gespeichert.  
  4. Admin-UI steuert To-Dos, Broadcasts, Countdown.  

---

## 2. API & Models

### 2.1 IONOS Model Hub
- **Base URL:** `https://openai.inference.de-txl.ionos.com/v1` (Berlin).  
- **Auth:** `Authorization: Bearer <token>`.  
- **Endpoints:**  
  - `/chat/completions` (Streaming via SSE).  
  - `/images/generations`.  
  - `/models` (Modellliste).  
- **Rate Limits:**  
  - 5 RPS base, 10 RPS burst.  
  - Images: 10/min base, 20/min burst.  
  - Fehler bei Überschreitung: HTTP 429 mit Retry-Header.  

### 2.2 Genutzte Modelle
- **Chat/Text:** Alle Modelle verfügbar. Default: `gpt-oss-120b`.  
- **Image:** Alle Text-to-Image-Modelle verfügbar. Default: `flux-1-schnell`.  
- **Embeddings:** nicht benötigt.  
- **Tool-Calling:** Modelle, die es unterstützen, nutzen Tools direkt. Andere: Retry mit direkter Anfrage.  
- **Kontextfenster:** pro Modell hinterlegt (Anzeige im UI).  

### 2.3 Tools
- **Websuche:** Serper.dev API (Free-Tier ausreichend).  
- **URL-Fetcher:** Edge Function lädt HTML/Text, wandelt nach Markdown.  

---

## 3. Security & Token Handling
- **Team-Codes:** 8-stellig, werden bei jedem Request mitgesendet.  
- **Mapping:** Code → hinterlegter IONOS-Token.  
- **Encryption:** AES-GCM, Schlüssel via PBKDF2 aus Team-Code.  
- **Salt/IV:** pro Token im Build hinterlegt.  
- **Token TTL:** 3 Tage.  
- **Storage:** keine Speicherung im Client, nur Session-Kontext.  

---

## 4. Frontend-Spezifikation

### 4.1 Tabs
- **Infos:** Google Docs (öffentlich, „Veröffentlichen im Web“), live gefetcht bei jeder Anfrage.  
- **Chat:**  
  - Token-Streaming mit Stop-Button.  
  - Nachrichten-Bearbeitung + Re-Send.  
  - Datei-Anhänge: PDF & TXT, max. 5 MB.  
  - Kontextfenster-Anzeige.  
  - Fehleranzeige mit Retry-Button.  
- **Bilder:**  
  - Prompt + Modell-Auswahl.  
  - Ergebnisbild anzeigen + Download.  
- **Einstellungen:**  
  - Dark/Light Mode.  
  - Sprache (DE/EN).  
  - Team-Info.  
  - System-Prompt (default durch Orga, anpassbar).  

### 4.2 UX
- Clean, modern, angelehnt an HIKEathon-Design.  
- Logos: HS Nordhausen, IONOS, HIKEathon.  
- Responsive für Desktop, Tablet, Smartphone.  
- Keine Swipe- oder Animations-Overheads.  

---

## 5. Admin-/Orga-Funktionen

### 5.1 Telemetrie
- **Aggregationen** (keine Raw Logs):  
  - Requests gesamt pro Team.  
  - Tokens in/out pro Team.  
  - Bild-Generierungen pro Team.  
  - Tool-Nutzung pro Team.  
  - Fehleranzahlen (401/429/Timeouts).  
- **Darstellung:** kompakte Übersicht in Admin-UI.

### 5.2 To-Dos
- Globale Checkliste durch Orga definiert.  
- Alle Teams sehen dieselben To-Dos auf Startseite.  
- Teams können Items abhaken (Status pro Team in DB).  

### 5.3 Broadcast & Countdown
- Broadcast-Nachrichten an alle Clients (Banner oben).  
- Countdown bis Submission-Ende, live aktualisierbar.  
- Änderungen von Orga wirken sofort.  

### 5.4 Teamstatus
- Admin kann sehen: To-Do-Fortschritt + Request-Statistiken je Team.  

---

## 6. Speicher & Datenbank (Supabase)
- **Tabellen (Skizze):**  
  - `teams` (id, code_hash, name).  
  - `telemetry` (team_id, ts_hour, req_count, tokens_in, tokens_out, errors, images, tools).  
  - `todos` (id, label, global).  
  - `tea
