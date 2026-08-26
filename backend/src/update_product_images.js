import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from './models/product.model.js';
import WebsiteProduct from './models/websiteProduct.model.js';

dotenv.config();

const IMAGE_MAPPING = {
  // Adobe
  'p-adobe-cc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Adobe_Creative_Cloud_rainbow_icon.svg/800px-Adobe_Creative_Cloud_rainbow_icon.svg.png',
  'p-cd345e': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Adobe_Express_logo_%282023%29.svg/800px-Adobe_Express_logo_%282023%29.svg.png',
  
  // Streaming OTT
  'p-ahagold': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Aha_OTT_Logo.svg/800px-Aha_OTT_Logo.svg.png',
  'p-primevideorb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/800px-Amazon_Prime_Video_logo.svg.png',
  'p-0ada20': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/800px-Amazon_Prime_Video_logo.svg.png',
  'p-prime': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Amazon_Prime_Video_logo.svg/800px-Amazon_Prime_Video_logo.svg.png',
  'p-apple-music': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Apple_Music_icon.svg/800px-Apple_Music_icon.svg.png',
  'p-848998': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Apple_TV_Plus_Logo.svg/800px-Apple_TV_Plus_Logo.svg.png',
  'p-chaupal': 'https://seeklogo.com/images/C/chaupal-logo-2782A7C316-seeklogo.com.png',
  'p-09a897': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Crunchyroll_Logo.png/800px-Crunchyroll_Logo.png',
  'p-crunchyrollrb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Crunchyroll_Logo.png/800px-Crunchyroll_Logo.png',
  'p-73ed10': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Discovery_Plus_logo.svg/800px-Discovery_Plus_logo.svg.png',
  'p-2472d8': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Disney%2B_logo.svg/800px-Disney%2B_logo.svg.png',
  'p-34810e': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/ESPN%2B_logo.svg/800px-ESPN%2B_logo.svg.png',
  'p-c3e0c3': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/HBO_Max_Logo.svg/800px-HBO_Max_Logo.svg.png',
  'p-hoichoi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Hoichoi_Logo.svg/800px-Hoichoi_Logo.svg.png',
  'p-hungama': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Hungama_Digital_Media_Entertainment_Logo.svg/800px-Hungama_Digital_Media_Entertainment_Logo.svg.png',
  'p-jiohotstar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Disney%2B_Hotstar_logo.svg/800px-Disney%2B_Hotstar_logo.svg.png',
  'p-kukutvfm': 'https://images.seeklogo.com/logo-png/43/1/kuku-fm-logo-png_seeklogo-431872.png',
  'p-mastram': 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop',
  'p-mxgold': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MX_Player_Logo.png/800px-MX_Player_Logo.png',
  'p-f35a03': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/800px-Netflix_2015_logo.svg.png',
  'p-netflixrb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/800px-Netflix_2015_logo.svg.png',
  'p-netflix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/800px-Netflix_2015_logo.svg.png',
  'p-e3bf88': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Plus.svg/800px-Paramount_Plus.svg.png',
  'p-shemaroo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Shemaroo_Entertainment_Logo.png/800px-Shemaroo_Entertainment_Logo.png',
  'p-sonyliv': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/SonyLIV_logo.svg/800px-SonyLIV_logo.svg.png',
  'p-spotifyrb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/800px-Spotify_logo_without_text.svg.png',
  'p-f5f077': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/800px-Spotify_logo_without_text.svg.png',
  'p-sunnxt': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Sun_NXT_logo.png/800px-Sun_NXT_logo.png',
  'p-youtube': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/YouTube_Logo_2017.svg/800px-YouTube_Logo_2017.svg.png',
  'p-c81720': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/YouTube_Logo_2017.svg/800px-YouTube_Logo_2017.svg.png',
  'p-zee5': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/ZEE5_logo.svg/800px-ZEE5_logo.svg.png',

  // Education & Productivity Tools
  'p-canva-edu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Canva_icon_2021.svg/800px-Canva_icon_2021.svg.png',
  'p-canvaedu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Canva_icon_2021.svg/800px-Canva_icon_2021.svg.png',
  'p-capcut': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Capcut_logo.svg/800px-Capcut_logo.svg.png',
  'p-coursera': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coursera-Logo_600x600.svg/800px-Coursera-Logo_600x600.svg.png',
  'p-duolingo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Duolingo_logo_%282019%29.svg/800px-Duolingo_logo_%282019%29.svg.png',
  'p-figma': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/800px-Figma-logo.svg.png',
  'p-freepik': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Freepik_Company_logo.svg/800px-Freepik_Company_logo.svg.png',
  'p-linkedin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/800px-LinkedIn_logo_initials.png',
  'p-ms-office': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Microsoft__365_%282022%29.svg/800px-Microsoft__365_%282022%29.svg.png',
  'p-notion': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Notion-logo.svg/800px-Notion-logo.svg.png',
  'p-05b9d0': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Notion-logo.svg/800px-Notion-logo.svg.png',
  'p-tradingview': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/TradingView_Logo.svg/800px-TradingView_Logo.svg.png',
  'p-windows': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Windows_logo_-_2021.svg/800px-Windows_logo_-_2021.svg.png',

  // AI Tools
  'p-83b85f': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/800px-ChatGPT_logo.svg.png',
  'p-54681d': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/800px-ChatGPT_logo.svg.png',
  'p-f6f6b4': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/800px-ChatGPT_logo.svg.png',
  'p-163d6a': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/ElevenLabs_Logo.svg/800px-ElevenLabs_Logo.svg.png',
  'p-68942c': 'https://gamma.app/favicon.ico',
  'p-566318': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/800px-Google_Gemini_logo.svg.png',
  'p-b2091a': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/800px-Google_Gemini_logo.svg.png',
  'p-b31f88': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Grammarly_logo.svg/800px-Grammarly_logo.svg.png',
  'p-2b7e90': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/XAI_Logo.svg/800px-XAI_Logo.svg.png',
  'p-303eb7': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/XAI_Logo.svg/800px-XAI_Logo.svg.png',
  'p-4b3209': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  'p-385f7d': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  'p-c52c0f': 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop',
  'p-ace426': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/N8n-logo-graphic.png/800px-N8n-logo-graphic.png',
  'p-27c7e9': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Perplexity_AI_logo.svg/800px-Perplexity_AI_logo.svg.png',

  // VPN
  'p-31f410': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/ExpressVPN_logo.svg/800px-ExpressVPN_logo.svg.png',
  'p-nordvpn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/NordVPN_Logo_2020.svg/800px-NordVPN_Logo_2020.svg.png',
  'p-e1e60e': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/NordVPN_Logo_2020.svg/800px-NordVPN_Logo_2020.svg.png',
  'p-protonvpn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Proton_VPN_logo_2022.svg/800px-Proton_VPN_logo_2022.svg.png',
  'p-purevpn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/PureVPN_Logo.svg/800px-PureVPN_Logo.svg.png',
  'p-43a35c': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Surfshark_Logo.svg/800px-Surfshark_Logo.svg.png',

  // Gaming
  'p-e9b313': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Grand_Theft_Auto_VI_logo.svg/800px-Grand_Theft_Auto_VI_logo.svg.png',
  'p-321306': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/PlayStation_logo.svg/800px-PlayStation_logo.svg.png',
};

async function updateImages() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const products = await Product.find({});
  let updatedCount = 0;

  for (const prod of products) {
    const id = prod.id || prod._id.toString();
    const newImage = IMAGE_MAPPING[id];
    if (newImage) {
      const currentMeta = prod.website_meta || {};
      prod.website_meta = {
        ...currentMeta,
        images: [newImage]
      };
      prod.images = [newImage];
      await Product.updateOne(
        { _id: prod._id },
        { 
          $set: { 
            'website_meta.images': [newImage],
            images: [newImage]
          } 
        }
      );
      updatedCount++;
      console.log(`Updated ${prod.name} (${id}) -> ${newImage}`);
    }
  }

  const webProducts = await WebsiteProduct.find({});
  for (const wp of webProducts) {
    const id = wp._id.toString();
    const newImage = IMAGE_MAPPING[id] || IMAGE_MAPPING[wp.id];
    if (newImage) {
      await WebsiteProduct.updateOne(
        { _id: wp._id },
        { $set: { images: [newImage] } }
      );
      console.log(`Updated WebsiteProduct ${wp.name} -> ${newImage}`);
    }
  }

  console.log(`Successfully updated ${updatedCount} products with authentic brand product images!`);
  process.exit(0);
}

updateImages().catch(err => {
  console.error('Error updating images:', err);
  process.exit(1);
});
