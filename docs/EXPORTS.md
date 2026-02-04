# Export System Design

> **Note:** This document is a **design specification** for an enhanced export system. The current implementation supports PDF and JSON exports only. The multi-format system with history described here is a **planned enhancement**.

## Current Implementation

- **PDF export:** Available on Course 2 journal page
- **JSON export:** Available on Course 2 journal page
- **Date range:** Not implemented (exports all entries)
- **History:** Not implemented

## Planned Enhancement

This document describes the multi-format export system for journal entries, including supported formats, API design, and UI components.

---

## Supported Formats

| Format | Extension | Use Case | Library |
|--------|-----------|----------|---------|
| CSV | `.csv` | Spreadsheet import, data analysis | Native |
| TXT | `.txt` | Plain text reading, printing | Native |
| PDF | `.pdf` | Professional sharing, archiving | `pdfkit` or `jspdf` |
| DOCX | `.docx` | Word processing, editing | `docx` |
| JSON | `.json` | Data backup, API integration | Native |

---

## API Design

### Export Endpoint

```
POST /api/exports
```

**Request Body:**
```json
{
  "format": "pdf",
  "dateFrom": "2026-01-01",
  "dateTo": "2026-01-31"
}
```

**Response:**
- Content-Type: Appropriate MIME type
- Content-Disposition: `attachment; filename="journal-export-2026-01.pdf"`
- Body: Binary file content

### Export History Endpoint

```
GET /api/exports/history
```

**Response:**
```json
{
  "exports": [
    {
      "id": 1,
      "format": "pdf",
      "dateFrom": "2026-01-01",
      "dateTo": "2026-01-31",
      "filename": "journal-export-2026-01.pdf",
      "fileSize": 45678,
      "entryCount": 31,
      "createdAt": "2026-02-01T10:30:00Z"
    }
  ]
}
```

### Re-Download Endpoint

```
GET /api/exports/:id/download
```

**Response:** Binary file content (if still available)

---

## Format Specifications

### CSV Format

```csv
Date,Morning Entry,Evening Entry,Mood
2026-01-01,"Started the day with meditation...","Reflected on today's progress...",calm
2026-01-02,"Woke up feeling energized...","Had a productive day...",happy
```

**Implementation:**
```typescript
function exportToCsv(entries: Journal[]): string {
  const headers = ['Date', 'Morning Entry', 'Evening Entry', 'Mood'];
  const rows = entries.map(e => [
    e.date,
    escapeCsvField(e.morningEntry || ''),
    escapeCsvField(e.eveningEntry || ''),
    e.mood || '',
  ]);
  
  return [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
```

### TXT Format

```
===== JOURNAL EXPORT =====
January 1, 2026 - December 31, 2026

----------------------------
January 1, 2026
Mood: calm

MORNING:
Started the day with meditation...

EVENING:
Reflected on today's progress...

----------------------------
January 2, 2026
Mood: happy

MORNING:
Woke up feeling energized...

EVENING:
Had a productive day...
```

**Implementation:**
```typescript
function exportToTxt(entries: Journal[]): string {
  const lines = ['===== JOURNAL EXPORT =====', ''];
  
  for (const entry of entries) {
    lines.push('----------------------------');
    lines.push(formatDate(entry.date));
    if (entry.mood) lines.push(`Mood: ${entry.mood}`);
    lines.push('');
    
    if (entry.morningEntry) {
      lines.push('MORNING:');
      lines.push(entry.morningEntry);
      lines.push('');
    }
    
    if (entry.eveningEntry) {
      lines.push('EVENING:');
      lines.push(entry.eveningEntry);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}
```

### PDF Format

**Structure:**
- Title page with date range
- Table of contents (optional for long exports)
- Each day as a section with headings
- Footer with page numbers

**Implementation (using pdfkit):**
```typescript
import PDFDocument from 'pdfkit';

function exportToPdf(entries: Journal[]): Buffer {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  
  doc.on('data', chunk => chunks.push(chunk));
  
  // Title
  doc.fontSize(24).text('Journal Export', { align: 'center' });
  doc.moveDown();
  
  for (const entry of entries) {
    doc.fontSize(14).text(formatDate(entry.date), { underline: true });
    
    if (entry.mood) {
      doc.fontSize(10).text(`Mood: ${entry.mood}`);
    }
    
    doc.moveDown(0.5);
    
    if (entry.morningEntry) {
      doc.fontSize(12).text('Morning', { bold: true });
      doc.fontSize(10).text(entry.morningEntry);
      doc.moveDown(0.5);
    }
    
    if (entry.eveningEntry) {
      doc.fontSize(12).text('Evening', { bold: true });
      doc.fontSize(10).text(entry.eveningEntry);
    }
    
    doc.moveDown();
  }
  
  doc.end();
  
  return Buffer.concat(chunks);
}
```

### DOCX Format

**Structure:**
- Document title
- Each day as Heading 2
- Morning/Evening as Heading 3
- Body text for entries

**Implementation (using docx library):**
```typescript
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

async function exportToDocx(entries: Journal[]): Promise<Buffer> {
  const children = [
    new Paragraph({
      text: 'Journal Export',
      heading: HeadingLevel.TITLE,
    }),
  ];
  
  for (const entry of entries) {
    children.push(
      new Paragraph({
        text: formatDate(entry.date),
        heading: HeadingLevel.HEADING_2,
      })
    );
    
    if (entry.morningEntry) {
      children.push(
        new Paragraph({ text: 'Morning', heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: entry.morningEntry })
      );
    }
    
    if (entry.eveningEntry) {
      children.push(
        new Paragraph({ text: 'Evening', heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: entry.eveningEntry })
      );
    }
  }
  
  const doc = new Document({ sections: [{ children }] });
  return await Packer.toBuffer(doc);
}
```

### JSON Format

```json
{
  "exportDate": "2026-02-01T10:30:00Z",
  "dateRange": {
    "from": "2026-01-01",
    "to": "2026-01-31"
  },
  "entryCount": 31,
  "entries": [
    {
      "date": "2026-01-01",
      "morningEntry": "Started the day with meditation...",
      "eveningEntry": "Reflected on today's progress...",
      "mood": "calm"
    }
  ]
}
```

---

## UI Components

### Export Panel

```tsx
function ExportPanel() {
  const [format, setFormat] = useState<string>('pdf');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, dateFrom, dateTo }),
      });
      
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')
        ?.split('filename=')[1] || `export.${format}`;
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF Document</SelectItem>
              <SelectItem value="docx">Word Document</SelectItem>
              <SelectItem value="csv">CSV Spreadsheet</SelectItem>
              <SelectItem value="txt">Plain Text</SelectItem>
              <SelectItem value="json">JSON Data</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>From Date</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} />
          </div>
          <div>
            <Label>To Date</Label>
            <DatePicker value={dateTo} onChange={setDateTo} />
          </div>
        </div>
        
        <Button 
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? 'Exporting...' : 'Download Export'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Export History List

```tsx
function ExportHistory() {
  const { data: history } = useQuery({
    queryKey: ['/api/exports/history'],
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Entries</TableHead>
              <TableHead>Size</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history?.exports.map(exp => (
              <TableRow key={exp.id}>
                <TableCell>{formatDate(exp.createdAt)}</TableCell>
                <TableCell>{exp.format.toUpperCase()}</TableCell>
                <TableCell>{exp.entryCount}</TableCell>
                <TableCell>{formatFileSize(exp.fileSize)}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => redownload(exp.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

---

## Access Control

Exports are only available to users who have purchased Course 2 or the Bundle.

```typescript
app.post('/api/exports', 
  isAuthenticated, 
  requireEntitlement('course2'), 
  exportHandler
);

app.get('/api/exports/history', 
  isAuthenticated, 
  requireEntitlement('course2'), 
  historyHandler
);
```

---

## Storage Strategy

**v1 (Current):** Generate on demand, no storage. Exports are created fresh each time, keeping architecture simple with zero cleanup.

**v2 (Planned):** Store export metadata in `export_history` table; optionally store files in temp storage for 24h re-downloads.

---

## File Storage Options

### Option 1: Generate on Demand (v1 - Current)
- No storage needed
- Regenerate each time
- Simple, no cleanup needed

### Option 2: Temporary Storage (v2 - Planned)
- Store in `/tmp` with TTL
- Enable re-downloads for 24 hours
- Cleanup via cron job

### Option 3: Object Storage (Future)
- Store in Replit Object Storage
- Permanent export history
- Higher storage costs
- Implementation with `@replit/object-storage`
