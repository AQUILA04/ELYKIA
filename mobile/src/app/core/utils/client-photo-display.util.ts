import { Capacitor } from '@capacitor/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

const DEFAULT_AVATAR = 'assets/icon/person-circle-outline.svg';

/** Prefer local / file paths over raw http MinIO markers. */
export function preferLocalPhotoPath(
  ...candidates: (string | null | undefined)[]
): string | null {
  const local = candidates.find((p) => !!p && !String(p).startsWith('http'));
  if (local) {
    return local;
  }
  return candidates.find((p) => !!p) ?? null;
}

function isPresignedHttpUrl(url: string): boolean {
  return (url.startsWith('http://') || url.startsWith('https://'))
    && (url.includes('X-Amz-Signature') || url.includes('X-Amz-Credential'));
}

/**
 * Resolve a path suitable for &lt;img [src]&gt;.
 * HTTPS presigned MinIO URLs are returned as plain strings (Angular allows them).
 * Capacitor / file paths still go through DomSanitizer because convertFileSrc
 * produces non-https schemes that require trust.
 */
export function resolveClientPhotoSrc(
  localPath: string | undefined | null,
  basePath: string,
  sanitizer: DomSanitizer
): string | SafeUrl {
  if (!localPath) {
    return DEFAULT_AVATAR;
  }

  if (localPath.startsWith('http://') || localPath.startsWith('https://')) {
    return isPresignedHttpUrl(localPath) ? localPath : DEFAULT_AVATAR;
  }

  if (Capacitor.getPlatform() === 'web' && !localPath.startsWith('assets')) {
    return DEFAULT_AVATAR;
  }

  if (localPath.startsWith('assets')) {
    return localPath;
  }

  if (localPath.startsWith('file://') || localPath.startsWith('content://')) {
    // Local device URI from Capacitor — not remote user content
    return sanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(localPath)); // NOSONAR
  }

  if (!basePath) {
    return DEFAULT_AVATAR;
  }

  const finalPath = basePath + (localPath.startsWith('/') ? '' : '/') + localPath;
  // Local device path under app data — not remote user content
  return sanitizer.bypassSecurityTrustUrl(Capacitor.convertFileSrc(finalPath)); // NOSONAR
}
