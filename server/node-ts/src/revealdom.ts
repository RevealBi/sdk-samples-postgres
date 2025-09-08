import * as fs from "fs";
import * as path from "path";
import { Application, Request, Response } from 'express';

// Note: RdashDocument would need to be imported from @revealbi/dom package
// import { RdashDocument } from '@revealbi/dom';

interface DashboardInfo {
    dashboardFileName: string;
    dashboardTitle: string;
}

interface VisualizationInfo {
    dashboardFileName: string;
    dashboardTitle: string;
    vizId: string;
    vizTitle: string;
    vizChartType: string;
    vizImageUrl: string;
}

export function setupRevealDomRoutes(app: Application): void {
    const dashboardDirectory = "dashboards";

    // Route to serve the main page
    app.get('/', (req: Request, res: Response) => {
        res.sendFile(path.join(process.cwd(), 'index.html'));
    });

    /**
     * @swagger
     * /dashboards/:
     *   get:
     *     summary: Retrieve a list of dashboard filenames
     *     description: Retrieves a list of dashboard filenames from the server.
     *     responses:
     *       200:
     *         description: A list of dashboard filenames
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: string
     */
    app.get("/dashboards/", (req: Request, res: Response) => {
        fs.readdir(dashboardDirectory, (err: NodeJS.ErrnoException | null, files: string[]) => {
            if (err) {
                console.log('Error getting directory information');
                res.status(500).send('Error getting directory information');
            } else {
                const filenames = files.map((file: string) => {
                    const extension = path.parse(file).ext;
                    return file.slice(0, -extension.length);
                });
                res.send(filenames);
            }
        });
    });

    /**
     * @swagger
     * /dashboards/names:
     *   get:
     *     summary: Retrieve dashboard names and titles
     *     description: Retrieves a list of dashboard filenames and their titles.
     *     responses:
     *       200:
     *         description: A list of dashboard filenames and titles
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   dashboardFileName:
     *                     type: string
     *                   dashboardTitle:
     *                     type: string
     */
    app.get("/dashboards/names", async (req: Request, res: Response) => {
        try {
            const fileNames: DashboardInfo[] = [];
            const dashboardFiles = fs.readdirSync(dashboardDirectory).filter((file: string) => file.endsWith('.rdash'));

            for (const fileName of dashboardFiles) {
                const filePath = path.join(dashboardDirectory, fileName);
                const fileData = fs.readFileSync(filePath);
                const buffer = Buffer.from(fileData);
                
                // Note: This would require @revealbi/dom package to be installed
                // const blob = new Blob([buffer], { type: 'application/zip' });
                // const document = await RdashDocument.load(blob);    

                fileNames.push({
                    dashboardFileName: path.basename(fileName, path.extname(fileName)),
                    dashboardTitle: path.basename(fileName, path.extname(fileName)) // Fallback when RdashDocument is not available
                    // dashboardTitle: document.title // Use this when RdashDocument is available
                });
            }
            res.status(200).json(fileNames);
        } catch (err: any) {
            console.error(`Error Reading Directory: ${err.message}`);
            res.status(500).send("An unexpected error occurred while processing the request.");
        }
    });

    /**
     * @swagger
     * /dashboards/{name}/exists:
     *   get:
     *     summary: Check if a dashboard exists
     *     description: Checks if a dashboard with the given name exists on the server.
     *     parameters:
     *       - in: path
     *         name: name
     *         required: true
     *         description: The name of the dashboard file (without extension).
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Returns true if the dashboard exists, false otherwise.
     *         content:
     *           application/json:
     *             schema:
     *               type: boolean
     */
    app.get("/dashboards/:name/exists", (req: Request, res: Response) => {
        if (fs.existsSync(`${dashboardDirectory}/${req.params.name}.rdash`)) {
            res.send(true);
        } else {
            res.send(false);
        }
    });

    /**
     * @swagger
     * /dashboards/visualizations:
     *   get:
     *     summary: Retrieve visualizations from dashboards
     *     description: Retrieves a list of visualizations and related metadata from all dashboards.
     *     responses:
     *       200:
     *         description: A list of visualizations from dashboards
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   dashboardFileName:
     *                     type: string
     *                   dashboardTitle:
     *                     type: string
     *                   vizId:
     *                     type: string
     *                   vizTitle:
     *                     type: string
     *                   vizChartType:
     *                     type: string
     *                   vizImageUrl:
     *                     type: string
     */
    app.get("/dashboards/visualizations", async (req: Request, res: Response) => {
        try {
            const allVisualizationChartInfos: VisualizationInfo[] = [];
            const dashboardFiles = fs.readdirSync(dashboardDirectory).filter((file: string) => file.endsWith('.rdash'));

            for (const fileName of dashboardFiles) {
                const filePath = path.join(dashboardDirectory, fileName);
                const fileData = fs.readFileSync(filePath);
                
                // Note: This would require @revealbi/dom package to be installed
                // const blob = new Blob([fileData], { type: 'application/zip' });
                // const document = await RdashDocument.load(blob);    

                // document.visualizations.forEach(viz => {
                //     const chartInfo: VisualizationInfo = {
                //         dashboardFileName: path.basename(filePath, '.rdash'),
                //         dashboardTitle: document.title,
                //         vizId: viz.id,
                //         vizTitle: viz.title,
                //         vizChartType: viz.chartType,
                //         vizImageUrl: getImageUrl(viz.chartType)
                //     };
                //     allVisualizationChartInfos.push(chartInfo);
                // });

                // Placeholder response when RdashDocument is not available
                const chartInfo: VisualizationInfo = {
                    dashboardFileName: path.basename(filePath, '.rdash'),
                    dashboardTitle: path.basename(filePath, '.rdash'),
                    vizId: 'sample-viz-1',
                    vizTitle: 'Sample Visualization',
                    vizChartType: 'ColumnVisualization',
                    vizImageUrl: getImageUrl('ColumnVisualization')
                };
                allVisualizationChartInfos.push(chartInfo);
            }
            res.status(200).json(allVisualizationChartInfos);
        } catch (ex: any) {
            res.status(500).send(`An error occurred: ${ex.message}`);
        }
    });

    function getImageUrl(input: string): string {
        const visualizationSuffix = "Visualization";
        console.log(input);
        if (input.toLowerCase().endsWith(visualizationSuffix.toLowerCase())) {
            input = input.substring(0, input.length - visualizationSuffix.length).trim();
        }
        const dashboardImagePath = "/images/svg/";
        return `${dashboardImagePath}${input}.svg`;
    }
}
