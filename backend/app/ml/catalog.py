"""Known services: category, typical monthly price (INR) and a cheaper alternative hint."""

CATALOG = {
    "netflix": ("Netflix", "Entertainment", 649, "Switch to the Mobile plan (₹149) or rotate Netflix every few months"),
    "amazon prime": ("Amazon Prime", "Entertainment", 299, "Prime Lite or the annual plan works out cheaper than monthly"),
    "hotstar": ("Disney+ Hotstar", "Entertainment", 299, "The yearly Mobile plan costs far less per month"),
    "jiocinema": ("JioCinema", "Entertainment", 29, "Free tier covers most live sports"),
    "sonyliv": ("SonyLIV", "Entertainment", 299, "Take the annual plan or subscribe only during live events"),
    "zee5": ("ZEE5", "Entertainment", 99, "Annual plan is about 40% cheaper"),
    "youtube premium": ("YouTube Premium", "Entertainment", 149, "Family or student plan lowers the per-person cost"),
    "spotify": ("Spotify", "Music", 119, "Duo or Family plan splits the cost; student plan is cheaper"),
    "apple music": ("Apple Music", "Music", 99, "Student plan or the Apple One bundle"),
    "gaana": ("Gaana", "Music", 99, "Free tier with ads, or merge into one music service"),
    "notion": ("Notion", "Productivity", 800, "The free plan is enough for personal use"),
    "canva": ("Canva", "Productivity", 500, "Canva for Education is free for students"),
    "chatgpt": ("ChatGPT Plus", "Productivity", 1999, "Use the free tier unless you hit limits daily"),
    "microsoft 365": ("Microsoft 365", "Productivity", 489, "Your university may provide it free"),
    "adobe": ("Adobe Creative Cloud", "Productivity", 1675, "Single-app plan or free alternatives like Figma/Photopea"),
    "linkedin premium": ("LinkedIn Premium", "Productivity", 1700, "Use the free month during active job search only"),
    "google one": ("Google One", "Cloud", 130, "Clean up storage to drop to a smaller tier"),
    "icloud": ("iCloud+", "Cloud", 75, "Offload photos to a single storage provider"),
    "dropbox": ("Dropbox", "Cloud", 900, "Consolidate with Google One or iCloud"),
    "cult": ("Cult.fit", "Fitness", 1500, "Pause the membership or pay per session if you go under 6 times a month"),
    "gym": ("Gym membership", "Fitness", 1500, "Quarterly or yearly plans cost less per month"),
    "coursera": ("Coursera Plus", "Education", 3000, "Audit for free or use financial aid"),
    "duolingo": ("Duolingo Super", "Education", 700, "The free tier is enough for most learners"),
    "udemy": ("Udemy", "Education", 500, "Buy individual courses during sales instead"),
    "xbox": ("Xbox Game Pass", "Gaming", 549, "Subscribe only when a game you want is on it"),
    "playstation": ("PlayStation Plus", "Gaming", 499, "Annual plan is cheaper per month"),
    "hdfc life": ("HDFC Life", "Insurance", 2000, None),
    "lic": ("LIC Premium", "Insurance", 3000, None),
    "airtel": ("Airtel", "Utilities", 399, "Compare yearly recharge plans"),
    "jio": ("Jio Recharge", "Utilities", 299, "Compare yearly recharge plans"),
    "times prime": ("Times Prime", "News", 1000, None),
    "the hindu": ("The Hindu", "News", 300, "Student and annual plans are cheaper"),
}

# Categories where holding 2+ active services is usually redundancy.
OVERLAP_CATEGORIES = {"Entertainment", "Music", "Cloud"}

CATEGORY_INDEX = {c: i for i, c in enumerate(
    ["Entertainment", "Music", "Productivity", "Cloud", "Fitness", "Education", "Insurance",
     "Finance", "News", "Gaming", "Utilities", "Other"])}


def lookup(name: str):
    n = name.lower()
    for key, val in CATALOG.items():
        if key in n:
            return val
    return None
