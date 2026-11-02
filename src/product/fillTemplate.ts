import { DOMParser, XMLSerializer, type Document, type Element } from "@xmldom/xmldom";
import JSZip from "jszip";
import type { ItineraryDay, ProductContent, SettingOptions } from "./productContent.js";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const HEADER_FIELDS = [
  ["SKU:", "sku"],
  ["URL:", "url"],
  ["Unite Name:", "uniteName"],
  ["Address:", "address"],
] as const;

export async function readSettingOptions(template: Buffer): Promise<SettingOptions> {
  const body = await templateBody(template);
  return {
    whatToCarry: optionTexts(body, "What to Carry", ["Trip Style"]),
    tripStyle: optionTexts(body, "Trip Style", ["Grading"]),
    grading: optionTexts(body, "Grading", ["Accommodation Type"]),
    accommodationType: optionTexts(body, "Accommodation Type", ["Interest"]),
    interest: optionTexts(body, "Interest", ["Trip highlights"]),
  };
}

export async function fillProductTemplate(template: Buffer, content: ProductContent): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("Template is missing word/document.xml");
  }

  const document = parseDocumentXml(await documentFile.async("string"));
  const body = documentBody(document);
  replaceHeader(body, content);
  clearSection(body, "AT A GLANCE", ["Settings"]);
  replaceCount(body, "Maximum Number of People:", content.settings.maximumNumberOfPeople);
  replaceCount(body, "Minimum Number of People:", content.settings.minimumNumberOfPeople);
  keepSelectedOptions(body, "What to Carry", ["Trip Style"], singleSelection(content.settings.whatToCarry));
  keepSelectedOptions(body, "Trip Style", ["Grading"], singleSelection(content.settings.tripStyle));
  keepSelectedOptions(body, "Grading", ["Accommodation Type"], content.settings.grading);
  keepSelectedOptions(body, "Accommodation Type", ["Interest"], content.settings.accommodationType);
  keepSelectedOptions(body, "Interest", ["Trip highlights"], content.settings.interest);
  replaceProseSection(body, "Trip highlights", ["WHAT'S INCLUDED"], content.tripHighlights, "List Paragraph");
  replaceProseSection(body, "WHAT'S INCLUDED", ["ITINERARY"], content.whatsIncluded, "List Paragraph");
  replaceItinerary(body, content.itinerary);
  replaceProseSection(body, "Meta Title", ["Meta Description"], [content.meta.title], "Normal5");
  replaceProseSection(body, "Meta Description", ["more info"], [content.meta.description], "Normal4");
  replaceProseSection(body, "Getting There", ["Weather & Climate"], paragraphsOf(content.moreInfo.gettingThere), "Normal4");
  replaceProseSection(
    body,
    "Weather & Climate",
    ["Biking Level"],
    paragraphsOf(content.moreInfo.weatherAndClimate),
    "Body",
  );
  replaceProseSection(body, "Biking Level", ["Bike Options"], paragraphsOf(content.moreInfo.bikingLevel), "Normal6");
  replaceProseSection(
    body,
    "Bike Options",
    ["Other Important Information"],
    paragraphsOf(content.moreInfo.bikeOptions),
    "Normal6",
  );
  replaceProseSection(
    body,
    "Other Important Information",
    [],
    paragraphsOf(content.moreInfo.otherImportantInformation),
    "None",
  );

  const serialized = new XMLSerializer().serializeToString(document);
  const xml = serialized.startsWith("<?xml")
    ? serialized
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${serialized}`;
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function templateBody(template: Buffer): Promise<Element> {
  const zip = await JSZip.loadAsync(template);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("Template is missing word/document.xml");
  }

  return documentBody(parseDocumentXml(await documentFile.async("string")));
}

function parseDocumentXml(xml: string): Document {
  const source = xml.replace(/^\uFEFF/, "");
  return new DOMParser().parseFromString(source, "application/xml");
}

function documentBody(document: Document): Element {
  const body = document.getElementsByTagNameNS(W_NS, "body").item(0);
  if (!body) {
    throw new Error("Template document has no body");
  }

  return body;
}

function replaceHeader(body: Element, content: ProductContent): void {
  for (const [label, key] of HEADER_FIELDS) {
    const paragraph = findExact(body, (text) => text.startsWith(label));
    const value = content.header[key];
    setParagraphText(paragraph, value.length === 0 ? label : `${label} ${value}`);
  }
}

function replaceCount(body: Element, label: string, value: string): void {
  const paragraph = findExact(body, (text) => text.startsWith(label));
  setParagraphText(paragraph, value.length === 0 ? label : `${label} ${value}`);
}

function clearSection(body: Element, heading: string, endHeadings: readonly string[]): void {
  const start = findExact(body, (text) => text === heading);
  const end = findFollowing(body, start, endHeadings);
  for (const paragraph of paragraphsBetween(body, start, end)) {
    body.removeChild(paragraph);
  }
}

function replaceProseSection(
  body: Element,
  heading: string,
  endHeadings: readonly string[],
  lines: readonly string[],
  style: string,
): void {
  const start = findExact(body, (text) => text === heading);
  const end = findFollowing(body, start, endHeadings);
  const between = paragraphsBetween(body, start, end);
  const prototype =
    between.find((paragraph) => paragraphStyle(paragraph) === style) ??
    between.find((paragraph) => paragraphText(paragraph).length > 0);
  if (!prototype) {
    throw new Error(`Template section ${heading} has no ${style} paragraph`);
  }

  const replacements = lines.map((line) => cloneParagraph(prototype, line));
  for (const paragraph of between) {
    body.removeChild(paragraph);
  }

  for (const paragraph of replacements) {
    body.insertBefore(paragraph, end);
  }
}

function replaceItinerary(body: Element, days: readonly ItineraryDay[]): void {
  const start = findExact(body, (text) => text === "ITINERARY");
  const end = findFollowing(body, start, ["Meta info"]);
  const between = paragraphsBetween(body, start, end);
  const title = requirePrototype(between, (paragraph) => paragraphStyle(paragraph) === "heading 24", "itinerary title");
  const activity = requirePrototype(between, (paragraph) => paragraphText(paragraph).startsWith("Level "), "itinerary activity");
  const narrative = requirePrototype(between, (paragraph) => paragraphStyle(paragraph) === "Body", "itinerary narrative");
  const accommodation = requirePrototype(
    between,
    (paragraph) => paragraphText(paragraph).startsWith("Accommodation:"),
    "itinerary accommodation",
  );
  const meals = requirePrototype(between, (paragraph) => paragraphText(paragraph).startsWith("Meals:"), "itinerary meals");
  const replacements: Element[] = [];

  for (const day of days) {
    replacements.push(cloneParagraph(title, day.title));
    for (const line of paragraphsOf(day.activity)) {
      replacements.push(cloneParagraph(activity, line));
    }
    for (const line of paragraphsOf(day.narrative)) {
      replacements.push(cloneParagraph(narrative, line));
    }
    if (day.accommodation.length > 0) {
      replacements.push(cloneParagraph(accommodation, `Accommodation: ${day.accommodation}`));
    }
    if (day.meals.length > 0) {
      replacements.push(cloneParagraph(meals, `Meals: ${day.meals}`));
    }
  }

  for (const paragraph of between) {
    body.removeChild(paragraph);
  }

  for (const paragraph of replacements) {
    body.insertBefore(paragraph, end);
  }
}

function keepSelectedOptions(
  body: Element,
  label: string,
  nextLabels: readonly string[],
  selected: readonly string[],
): void {
  const start = findExact(body, (text) => text === label);
  const end = findFollowing(body, start, nextLabels);
  const between = paragraphsBetween(body, start, end);
  const allowed = between.map(paragraphText).filter((text) => text.length > 0);

  for (const value of selected) {
    if (!allowed.includes(value)) {
      throw new Error(`Setting value "${value}" is not in the template list for ${label}`);
    }
  }

  for (const paragraph of between) {
    if (!selected.includes(paragraphText(paragraph))) {
      body.removeChild(paragraph);
    }
  }
}

function optionTexts(body: Element, label: string, nextLabels: readonly string[]): string[] {
  const start = findExact(body, (text) => text === label);
  const end = findFollowing(body, start, nextLabels);
  return paragraphsBetween(body, start, end)
    .map(paragraphText)
    .filter((text) => text.length > 0);
}

function findExact(body: Element, matches: (text: string) => boolean): Element {
  for (const paragraph of bodyParagraphs(body)) {
    if (matches(paragraphText(paragraph))) {
      return paragraph;
    }
  }

  throw new Error("Template heading was not found");
}

function findFollowing(body: Element, start: Element, endHeadings: readonly string[]): Element {
  let seenStart = false;
  for (const child of elementChildren(body)) {
    if (child === start) {
      seenStart = true;
      continue;
    }

    if (!seenStart) {
      continue;
    }

    if (child.localName === "p" && endHeadings.includes(paragraphText(child))) {
      return child;
    }

    if (child.localName === "sectPr") {
      return child;
    }
  }

  throw new Error("Template section boundary was not found");
}

function paragraphsBetween(body: Element, start: Element, end: Element): Element[] {
  const paragraphs: Element[] = [];
  let seenStart = false;
  for (const child of elementChildren(body)) {
    if (child === start) {
      seenStart = true;
      continue;
    }

    if (!seenStart || child === end) {
      if (child === end) {
        break;
      }
      continue;
    }

    if (child.localName === "p") {
      paragraphs.push(child);
    }
  }

  return paragraphs;
}

function bodyParagraphs(body: Element): Element[] {
  return elementChildren(body).filter((child) => child.localName === "p");
}

function elementChildren(parent: Element): Element[] {
  const children: Element[] = [];
  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const child = parent.childNodes.item(index);
    if (child?.nodeType === 1) {
      children.push(child as Element);
    }
  }

  return children;
}

function paragraphText(paragraph: Element): string {
  const texts = paragraph.getElementsByTagNameNS(W_NS, "t");
  let value = "";
  for (let index = 0; index < texts.length; index += 1) {
    value += texts.item(index)?.textContent ?? "";
  }

  return value.trim();
}

function paragraphStyle(paragraph: Element): string {
  const style = paragraph.getElementsByTagNameNS(W_NS, "pStyle").item(0);
  return style?.getAttributeNS(W_NS, "val") ?? style?.getAttribute("w:val") ?? "";
}

function setParagraphText(paragraph: Element, text: string): void {
  const runs = paragraph.getElementsByTagNameNS(W_NS, "r");
  const firstRun = runs.item(0);
  if (!firstRun) {
    throw new Error("Template paragraph has no text run");
  }

  for (let index = runs.length - 1; index >= 1; index -= 1) {
    const run = runs.item(index);
    run?.parentNode?.removeChild(run);
  }

  const textNodes = firstRun.getElementsByTagNameNS(W_NS, "t");
  const firstText = textNodes.item(0);
  if (!firstText) {
    throw new Error("Template paragraph has no text node");
  }

  for (let index = textNodes.length - 1; index >= 1; index -= 1) {
    const node = textNodes.item(index);
    node?.parentNode?.removeChild(node);
  }

  firstText.textContent = text;
}

function cloneParagraph(prototype: Element, text: string): Element {
  const clone = prototype.cloneNode(true) as Element;
  setParagraphText(clone, text);
  return clone;
}

function requirePrototype(
  paragraphs: readonly Element[],
  matches: (paragraph: Element) => boolean,
  description: string,
): Element {
  const prototype = paragraphs.find(matches);
  if (!prototype) {
    throw new Error(`Template is missing an ${description} paragraph`);
  }

  return prototype;
}

function paragraphsOf(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function singleSelection(value: string): string[] {
  return value.length === 0 ? [] : [value];
}
