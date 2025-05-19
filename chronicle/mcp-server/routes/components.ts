import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { CHRONICLE_CONFIG } from '../../chronicle.config.js';

const metadataPath = path.resolve(process.cwd(), CHRONICLE_CONFIG.componentsMetadataPath);

export function getComponents(req: Request, res: Response) {
  const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const components = data?.tags?.map((tag: any) => ({
    name: tag.name,
    description: tag.description,
  })) || [];
  res.json(components);
}

export function getProps(req: Request, res: Response) {
  const { component } = req.query;
  const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const tag = data?.tags?.find((t: any) => t.name === component);
  res.json(tag?.attributes || []);
}
