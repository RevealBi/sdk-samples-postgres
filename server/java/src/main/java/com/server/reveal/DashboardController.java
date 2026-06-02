package com.server.reveal;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * DOM helper endpoints, ported from the 1.x Jersey {@code DomController} to a plain
 * servlet so it can coexist with the Reveal 2.0 engine servlet mounted at "/*".
 *
 * <ul>
 *   <li>GET /dashboards/names           &rarr; [{ dashboardFileName, dashboardTitle }, ...]</li>
 *   <li>GET /dashboards/visualizations  &rarr; [{ dashboardFileName, dashboardTitle, vizId, ... }, ...]</li>
 * </ul>
 */
public class DashboardController extends HttpServlet {

    private static final String DASHBOARDS_FOLDER = "dashboards";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getServletPath();
        if (path == null || path.isEmpty()) {
            path = req.getRequestURI();
        }

        Object payload = path.endsWith("/visualizations") ? getRdashData() : getDashboardNames();

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(resp.getWriter(), payload);
    }

    public List<VisualizationChartInfo> getRdashData() {
        List<VisualizationChartInfo> visualizationChartInfoList = new ArrayList<>();

        try {
            File folder = new File(DASHBOARDS_FOLDER);
            File[] rdashFiles = folder.listFiles((dir, name) -> name.endsWith(".rdash"));
            if (rdashFiles == null || rdashFiles.length == 0) {
                System.out.println("No .rdash files found in the folder");
                return visualizationChartInfoList;
            }

            for (File rdashFile : rdashFiles) {
                String fileNameWithoutExtension = rdashFile.getName().replaceFirst("[.][^.]+$", "");
                String jsonContent = extractJsonFromRdash(rdashFile.getPath());
                if (jsonContent.isEmpty()) {
                    System.out.println("No JSON content found in the rdash file: " + rdashFile.getName());
                    continue;
                }

                String title = extractTitleFromJson(jsonContent);
                List<VisualizationChartInfo> widgetInfoList = parseWidgetsFromJson(jsonContent, fileNameWithoutExtension, title);
                visualizationChartInfoList.addAll(widgetInfoList);
            }

        } catch (IOException e) {
            System.err.println("Error while reading the rdash files: " + e.getMessage());
            e.printStackTrace();
        }

        return visualizationChartInfoList;
    }

    public List<DashboardInfo> getDashboardNames() {
        List<DashboardInfo> dashboardNamesList = new ArrayList<>();

        try {
            File folder = new File(DASHBOARDS_FOLDER);
            File[] rdashFiles = folder.listFiles((dir, name) -> name.endsWith(".rdash"));
            if (rdashFiles == null || rdashFiles.length == 0) {
                System.out.println("No .rdash files found in the folder");
                return dashboardNamesList;
            }

            for (File rdashFile : rdashFiles) {
                String fileNameWithoutExtension = rdashFile.getName().replaceFirst("[.][^.]+$", "");
                String jsonContent = extractJsonFromRdash(rdashFile.getPath());
                if (jsonContent.isEmpty()) {
                    System.out.println("No JSON content found in the rdash file: " + rdashFile.getName());
                    continue;
                }

                String title = extractTitleFromJson(jsonContent);
                dashboardNamesList.add(new DashboardInfo(fileNameWithoutExtension, title));
            }

        } catch (IOException e) {
            System.err.println("Error while reading the rdash files: " + e.getMessage());
            e.printStackTrace();
        }

        return dashboardNamesList;
    }

    public String extractJsonFromRdash(String filePath) throws IOException {
        StringBuilder jsonContent = new StringBuilder();
        try (ZipFile zipFile = new ZipFile(filePath)) {
            for (ZipEntry entry : zipFile.stream().toArray(ZipEntry[]::new)) {
                if (entry.getName().endsWith(".json")) {
                    try (InputStream stream = zipFile.getInputStream(entry);
                         BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            jsonContent.append(line);
                        }
                    }
                    break;
                }
            }
        } catch (IOException e) {
            System.err.println("Error while extracting JSON from rdash: " + e.getMessage());
            throw e;
        }
        return jsonContent.toString();
    }

    public String extractTitleFromJson(String jsonContent) {
        JSONObject jsonObject = new JSONObject(jsonContent);
        return jsonObject.optString("Title", "Untitled");
    }

    public List<VisualizationChartInfo> parseWidgetsFromJson(String jsonContent, String dashboardFileName, String dashboardTitle) {
        List<VisualizationChartInfo> widgetInfoList = new ArrayList<>();
        JSONObject jsonObject = new JSONObject(jsonContent);

        if (!jsonObject.has("Widgets")) {
            System.out.println("No widgets found in the JSON");
            return widgetInfoList;
        }

        JSONArray widgets = jsonObject.getJSONArray("Widgets");

        for (int i = 0; i < widgets.length(); i++) {
            JSONObject widget = widgets.getJSONObject(i);

            String vizId = widget.optString("Id", "Unknown Id");
            String vizTitle = widget.optString("Title", "Untitled");
            JSONObject visualizationSettings = widget.optJSONObject("VisualizationSettings");
            String vizChartType = "Unknown Chart Type";

            if (visualizationSettings != null) {
                String type = visualizationSettings.optString("_type");

                switch (type) {
                    case "IndicatorVisualizationSettingsType":
                        vizChartType = "KpiTime";
                        break;
                    case "SingleRowVisualizationSettingsType":
                        vizChartType = "TextView";
                        break;
                    case "IndicatorTargetVisualizationSettingsType":
                        vizChartType = "KpiTarget";
                        break;
                    case "DiyVisualizationSettingsType":
                        vizChartType = "Custom";
                        break;
                    case "AssetVisualizationSettingsType":
                        vizChartType = "Image";
                        break;
                    case "GridVisualizationSettingsType":
                        vizChartType = "Grid";
                        break;
                    case "GaugeVisualizationSettingsType":
                        vizChartType = "Gauge";
                        break;
                    case "TreeMapVisualizationSettingsType":
                        vizChartType = "TreeMap";
                        break;
                    case "PivotVisualizationSettingsType":
                        vizChartType = "Pivot";
                        break;
                    case "ChoroplethMapVisualizationSettingsType":
                        vizChartType = "Choropleth";
                        break;
                    case "CompositeVisualizationSettingsType":
                        vizChartType = "Combo";
                        break;
                    default:
                        vizChartType = visualizationSettings.optString("ChartType", "Unknown Chart Type");
                        break;
                }
            }

            String vizImageUrl = getImageUrl(vizChartType);
            widgetInfoList.add(new VisualizationChartInfo(
                    dashboardFileName, dashboardTitle, vizId, vizTitle, vizChartType, vizImageUrl
            ));
        }
        return widgetInfoList;
    }

    public String getImageUrl(String input) {
        String visualizationSuffix = "Visualization";
        if (input.toLowerCase().endsWith(visualizationSuffix.toLowerCase())) {
            input = input.substring(0, input.length() - visualizationSuffix.length()).trim();
        }
        String dashboardImagePath = "/images/";
        return dashboardImagePath + input + ".png";
    }

    public static class DashboardInfo {
        private String dashboardFileName;
        private String dashboardTitle;

        public DashboardInfo(String dashboardFileName, String dashboardTitle) {
            this.dashboardFileName = dashboardFileName;
            this.dashboardTitle = dashboardTitle;
        }

        public String getDashboardFileName() {
            return dashboardFileName;
        }

        public String getDashboardTitle() {
            return dashboardTitle;
        }
    }
}
