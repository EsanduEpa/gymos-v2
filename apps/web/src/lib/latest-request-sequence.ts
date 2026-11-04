/** Tracks client reads so responses from older requests cannot replace newer data. */
export class LatestRequestSequence {
  private sequence = 0;

  begin(): number {
    return ++this.sequence;
  }

  isCurrent(requestId: number): boolean {
    return requestId === this.sequence;
  }

  invalidate(): void {
    this.sequence++;
  }
}
