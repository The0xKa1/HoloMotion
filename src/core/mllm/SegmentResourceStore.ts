import type { MllmVideoSegment, MllmVideoSegmentationResult } from "./VideoSegmentationClient.js";

export interface SegmentResource {
  id: string;
  sourceFile: File;
  sourceUrl: string;
  thumbnail: string;
  status: "ready";
  segment: MllmVideoSegment;
  summary: string;
  globalTags: string[];
}

export class SegmentResourceStore {
  private resources: SegmentResource[] = [];
  private sourceUrl: string | null = null;

  replace(file: File, result: MllmVideoSegmentationResult, thumbnails: Map<string, string>): SegmentResource[] {
    this.clear();
    this.sourceUrl = URL.createObjectURL(file);
    this.resources = result.segments.map((segment) => ({
      id: segment.id,
      sourceFile: file,
      sourceUrl: this.sourceUrl!,
      thumbnail: thumbnails.get(segment.id) ?? "",
      status: "ready",
      segment,
      summary: result.summary,
      globalTags: result.globalTags,
    }));
    return this.all();
  }

  all(): SegmentResource[] {
    return [...this.resources];
  }

  get(id: string): SegmentResource | null {
    return this.resources.find((item) => item.id === id) ?? null;
  }

  clear(): void {
    if (this.sourceUrl) {
      URL.revokeObjectURL(this.sourceUrl);
      this.sourceUrl = null;
    }
    this.resources = [];
  }
}
