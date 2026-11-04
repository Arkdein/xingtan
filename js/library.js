// Bundled background images. Files live in backgrounds/<id>.webp (1920×1080)
// and backgrounds/thumbs/<id>.webp. Every image is public domain or CC0;
// credits are shown in the picker and listed in the README.
//
// { id, category, title, creator, source, license, url, lum }
//   lum: average brightness 0–255 (for light or dark corner controls)

export const CATEGORIES = [
  { id: 'chinese', label: 'Chinese paintings', zh: '中国画' },
  { id: 'nature', label: 'Nature', zh: '自然' },
  { id: 'singapore', label: 'Singapore', zh: '新加坡' },
  { id: 'festive', label: 'Festive', zh: '节庆' },
];

export const LIBRARY = [
  {"id": "cn-streams-mountains", "category": "chinese", "title": "Streams and Mountains without End (detail)", "creator": "Unidentified artist, Northern Song–Jin dynasty", "source": "Cleveland Museum of Art, via Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/w/index.php?curid=76240240", "lum": 103},
  {"id": "cn-bulbuls", "category": "chinese", "title": "Chinese Bulbuls and Flowering Cherry-Apple", "creator": "Unidentified artist", "source": "The Met, via Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:MET_DP202773_CRD.jpg", "lum": 133},
  {"id": "cn-finches-bamboo", "category": "chinese", "title": "Finches and Bamboo", "creator": "Emperor Huizong of Song", "source": "The Met, via Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:%E5%8C%97%E5%AE%8B_%E5%BE%BD%E5%AE%97_%E7%AB%B9%E7%A6%BD%E5%9C%96_%E5%8D%B7-Finches_and_bamboo_MET_DP151504_CRD.jpg", "lum": 125},
  {"id": "cn-thousand-li", "category": "chinese", "title": "A Thousand Li of Rivers and Mountains (detail)", "creator": "Wang Ximeng", "source": "Palace Museum, Beijing, via Wikimedia Commons", "license": "Public domain", "url": "https://commons.wikimedia.org/wiki/File:Wang_Ximeng_-_A_Thousand_Li_of_River_(Bridge).jpg", "lum": 101},
  {"id": "cn-orchids-bamboo", "category": "chinese", "title": "Orchids and Bamboo (detail)", "creator": "Zheng Xie", "source": "The Met, via Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:%E6%B8%85_%E9%84%AD%E7%87%AE_%E8%98%AD%E7%AB%B9%E5%9C%96_%E5%8D%B7-Orchids_and_Bamboo_MET_DP204894.jpg", "lum": 193},
  {"id": "na-misty-mountains", "category": "nature", "title": "Misty mountains", "creator": "James Bloedel", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Misty_Mountains_(Unsplash_zR40wedS1aQ).jpg", "lum": 158},
  {"id": "na-hills", "category": "nature", "title": "Hills in morning haze", "creator": "NutzerAusBerlin", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Janov_20260919_Aussichtsturm_Aussicht_30.jpg", "lum": 152},
  {"id": "na-calm-waters", "category": "nature", "title": "Calm waters", "creator": "U.S. Fish and Wildlife Service", "source": "Wikimedia Commons", "license": "Public domain", "url": "https://commons.wikimedia.org/wiki/File:Calm_Waters_(34595165103).jpg", "lum": 144},
  {"id": "na-cumulus", "category": "nature", "title": "Cumulus clouds", "creator": "desilia", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Cumulus_clouds_in_the_sky.jpg", "lum": 174},
  {"id": "na-sea-sky", "category": "nature", "title": "Sea, sky and clouds", "creator": "Joselodos", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Sea_sky_and_clouds,_Ibiza,_Spain.jpg", "lum": 183},
  {"id": "na-tea-plantation", "category": "nature", "title": "Choui Fong tea plantation, Thailand", "creator": "Denchai (Pixabay)", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/w/index.php?curid=71046579", "lum": 144},
  {"id": "sg-skyline", "category": "singapore", "title": "Singapore skyline", "creator": "DvTor8303", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Skyline_of_Singapore_Central_Business_District_20250903.jpg", "lum": 119},
  {"id": "sg-marina-bay-night", "category": "singapore", "title": "Marina Bay at night", "creator": "Sven Scheuermeier", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Singapore_Skyline_(Unsplash).jpg", "lum": 86},
  {"id": "sg-marina-bay", "category": "singapore", "title": "Marina Bay Sands and the ArtScience Museum", "creator": "Mustang Joe", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:Downtown_Singapore,_1_November_2024_(54212697906).jpg", "lum": 136},
  {"id": "sg-supertrees", "category": "singapore", "title": "Supertree Grove, Gardens by the Bay", "creator": "Balon Greyjoy", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/w/index.php?curid=123864846", "lum": 118},
  {"id": "sg-hdb", "category": "singapore", "title": "HDB flats", "creator": "Bernard Spragg", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/w/index.php?curid=105178287", "lum": 127},
  {"id": "fe-cny-lanterns", "category": "festive", "title": "Red lanterns for Chinese New Year", "creator": "Silentpilot", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/w/index.php?curid=75924834", "lum": 121},
  {"id": "fe-lanterns", "category": "festive", "title": "Lanterns, Nagasaki Lantern Festival", "creator": "Balon Greyjoy", "source": "Wikimedia Commons", "license": "CC0", "url": "https://commons.wikimedia.org/wiki/File:20190202_Nagasaki_Chinese_New_Year_lantern-4.jpg", "lum": 96},
  {"id": "fe-deepavali", "category": "festive", "title": "Oil lamp for Deepavali", "creator": "", "source": "rawpixel", "license": "CC0", "url": "https://www.rawpixel.com/image/5925541/photo-image-lights-public-domain-fire", "lum": 54},
  {"id": "fe-fireworks", "category": "festive", "title": "Fireworks", "creator": "Mike Enerio", "source": "StockSnap", "license": "CC0", "url": "https://stocksnap.io/photo/fireworks-lights-11JGOISGC7", "lum": 88},
  {"id": "fe-christmas", "category": "festive", "title": "Christmas lights", "creator": "Joanna Kosinska", "source": "StockSnap", "license": "CC0", "url": "https://stocksnap.io/photo/christmas-lights-QAO7TLCIYC", "lum": 22},
];
