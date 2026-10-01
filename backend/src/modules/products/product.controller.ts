import { Request, Response } from "express";
import prisma from "../../config/prisma";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          include: {
            inventory: true
          }
        }
      }
    });

    // Format them for the frontend
    const formatted = products.map(p => {
       const allImages = p.variants.map(v => v.image);
       const variants = p.variants.map(v => ({ id: v.id, image: v.image, thumbnail: v.thumbnail }));
       const sizes = Array.from(new Set(p.variants.flatMap(v => v.inventory.map(inv => inv.size)))).sort((a,b)=>a-b);

       return {
         id: p.id,
         brand: p.brand,
         title: p.title,
         price: p.price,
         images: allImages,
         variants,
         sizes,
         composition: [
           { name: "POLYAMIDE", value: 100 } // dummy
         ],
         description: p.description,
         statusColor: p.statusColor,
       };
    });

    res.json({ success: true, products: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
