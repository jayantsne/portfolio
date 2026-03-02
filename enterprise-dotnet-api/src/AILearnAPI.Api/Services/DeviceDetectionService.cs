namespace AILearnAPI.Api.Services;

/// <summary>
/// Classifies an HTTP User-Agent string into one of three device tiers.
/// Classification is done entirely server-side from the raw User-Agent header,
/// so users cannot influence their assigned tier by sending a fake client hint.
/// </summary>
public enum DeviceType { Mobile, Tablet, Desktop }

public interface IDeviceDetectionService
{
    /// <summary>
    /// Detects the device type from a raw User-Agent string.
    /// Returns <see cref="DeviceType.Desktop"/> when the UA is empty or unrecognised.
    /// </summary>
    DeviceType Detect(string? userAgent);
}

public class DeviceDetectionService : IDeviceDetectionService
{
    // ── Ordered keyword lists (checked top-to-bottom; first match wins) ──────

    // Mobile-specific keywords — must be checked BEFORE tablet so that
    // "Mobile" tokens don't accidentally slip through to the tablet branch.
    private static readonly string[] MobileKeywords =
    [
        "iphone", "ipod",
        "android",          // checked first; most Android phones contain "mobile" too
        "mobile",
        "blackberry", "windows phone", "bb10",
        "fennec",           // Firefox mobile
        "silk/",            // Amazon Fire phone (not tablet)
        "opera mini", "opera mobi",
        "ucbrowser",
    ];

    // Tablet-specific keywords — must appear BEFORE generic "desktop" fallback.
    private static readonly string[] TabletKeywords =
    [
        "ipad",
        "android",          // Android WITHOUT "mobile" → tablet (checked after stripping phones above)
        "kindle", "silk",   // Amazon Fire tablet
        "tablet",
        "playbook",         // BlackBerry PlayBook
        "nexus 7", "nexus 9", "nexus 10",
        "surface",          // Microsoft Surface in tablet UA mode
        "sm-t",             // Samsung Galaxy Tab series
    ];

    public DeviceType Detect(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
            return DeviceType.Desktop; // fail-safe: most restrictive → desktop limit

        var ua = userAgent.ToLowerInvariant();

        // ── Step 1: explicit mobile check ────────────────────────────────────
        // Android phones always carry "mobile" in the UA string.
        // iPads do NOT.  We check mobile first.
        foreach (var keyword in MobileKeywords)
        {
            if (keyword == "android")
            {
                // Android + "mobile" → phone; Android without "mobile" → tablet (handled below)
                if (ua.Contains("android") && ua.Contains("mobile"))
                    return DeviceType.Mobile;
                // don't return here — fall through to tablet check for Android tablets
            }
            else if (ua.Contains(keyword))
            {
                return DeviceType.Mobile;
            }
        }

        // ── Step 2: tablet check ─────────────────────────────────────────────
        foreach (var keyword in TabletKeywords)
        {
            if (ua.Contains(keyword))
                return DeviceType.Tablet;
        }

        // ── Step 3: everything else is treated as desktop ────────────────────
        return DeviceType.Desktop;
    }
}
