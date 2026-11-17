# Serving Text Chapters

Some sources publish serialized prose instead of page images. The contract
expresses both with the same adapter: a series declares its
`contentKind`, and a text chapter returns a body instead of pages.

This guide covers a text-only adapter. The image path is unchanged, so a
website that serves both can expose both.

## 1. Declare the content kind

The runtime normalises the text found by `details.contentKind`: anything that
mentions *text*, *novel*, *book*, *prose* or *reading* becomes `'text'`,
everything else `'image'`.

```ts
import { defineTheme } from '@blankgrimoire/types';

export default defineTheme({
  id: 'theme.example',
  name: 'Example Prose',
  version: '1.0.0',
  detectionSignature: { selectors: ['.prose-reader'], minScore: 5 },
  selectors: {
    search: { path: '/search', item: '.result', title: '.title', link: 'a' },
    details: {
      title: 'h1.series-title',
      status: '.series-status',
      contentRating: '.series-rating',
      contentKind: '.series-kind', // e.g. "Web Novel"
    },
    chapters: { item: '.chapter', link: 'a', order: 'asc' },
    pages: { strategies: [] }, // no image pages
    content: {
      strategies: [
        {
          kind: 'css-text',
          container: '.chapter-body',
          paragraph: '.chapter-body p',
          title: 'h1.chapter-title',
          remove: ['.chapter-nav', '.promo-slot'],
          join: '\n\n',
        },
      ],
    },
  },
});
```

Also advertise it in the manifest so a host can warn before installing:

```json
{
  "contentKinds": ["text"]
}
```

Missing `contentKinds` means `["image"]`, which keeps every existing adapter
valid.

## 2. Choose the body format

| Strategy | Output | Use when |
|---|---|---|
| `css-text` | Plain text, paragraphs joined by `join` | The reader controls typography |
| `css-html` | Container markup | Formatting (emphasis, quotes) matters |

`css-text` collects every match of `paragraph` inside `container` and joins
non-empty values; with no `paragraph` it uses the container text. `css-html`
returns the container markup as-is.

Both return `null` when the container is missing or empty, so the next strategy
is tried.

## 3. Hooks, when selectors are not enough

```ts
hooks: {
  async getContent(ctx, mangaKey, chapterKey) {
    const response = await __http({ url: chapterKey, method: 'GET' });
    const document = __parseHTML(response.body);
    const body = document.querySelector('.chapter-body')?.innerHTML ?? '';
    return {
      key: chapterKey,
      body: { kind: 'html', value: body },
    };
  },
},
```

Hooks take precedence over `content.strategies`, exactly like `getPages`.

## 4. Sanitise in the host, not here

The body is **untrusted markup**. The runtime does not strip scripts, frames,
inline handlers or remote styles: it runs in JavaScriptCore with a minimal DOM
and cannot verify sanitisation. The host must sanitise before rendering and
must never execute adapter-provided script.

`remove` selectors are best effort: they require a mutable DOM. A host whose
parser cannot mutate ignores them and relies on its sanitiser, so treat
`remove` as a convenience for readability, not as a security boundary.

## 5. Paid content

A locked text chapter must never reach the host. The chapter list already
drops locked rows through `chapters.excludeItem`; keep that selector accurate
for prose sources too, because there are no pages to guard with `skipWhen`.

## 6. Test it

`VMHarness` exercises the real runtime bundle and returns the extracted
content:

```ts
const result = await harness.testTheme(html, 'https://example.org/', {
  mangaKey: 'lorem-ipsum',
  chapterKey: 'https://example.org/series/lorem/chapter-12',
});

expect(result.details?.contentKind).toBe('text');
expect(result.content?.body.kind).toBe('text');
expect(result.content?.body.value).toContain('First paragraph.');
```

Cover three cases before publishing:

1. a text chapter with a body,
2. an image adapter that leaves `content` out (it must still work),
3. a locked chapter that never appears in `chapters`.

## Related

- [Contract overview](../contract/overview.md)
- [ADR 0001: text chapters on API version 1](../contract/adr-0001-text-chapters.md)
- [Writing declarative selectors](writing-selectors.md)
