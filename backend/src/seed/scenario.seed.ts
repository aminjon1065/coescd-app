import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { EdmDocument, EdmDocumentStatus, EdmDocumentType } from '../edm/entities/edm-document.entity';
import { EdmDocumentRoute } from '../edm/entities/edm-document-route.entity';
import { EdmRouteStage } from '../edm/entities/edm-route-stage.entity';
import { EdmDocumentTaskLink } from '../edm/entities/edm-document-task-link.entity';
import { Task, TaskStatus } from '../task/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../department/entities/department.entity';
import { Disaster } from '../analytics/disasters/entities/disaster.entity';
import { DisasterType } from '../analytics/disasterTypes/entities/disaster-type.entity';
import { DisasterCategory } from '../analytics/disasterCategories/entities/category.entity';

const SEED_PREFIX = '[SEED]';
const SEED_ROUTE_REASON = '[SEED] scenario routing';

const DOC_TITLES = {
  floodRisk: `${SEED_PREFIX} Incoming: Flood Risk Assessment - North Delta`,
  portClosure: `${SEED_PREFIX} Incoming: Port Closure Notice - Bay District`,
  severeWeather: `${SEED_PREFIX} Incoming: Severe Weather Advisory - Coastal Belt`,
  hospitalCapacity: `${SEED_PREFIX} Incoming: Hospital Capacity Alert - Central Region`,
  wildfireUpdate: `${SEED_PREFIX} Incoming: Wildfire Spread Update - Pine Ridge`,
  supplyChain: `${SEED_PREFIX} Incoming: Supply Chain Disruption Report - Eastern Corridor`,
  waterAlert: `${SEED_PREFIX} Incoming: Water Contamination Alert - Riverbend`,
  gridStability: `${SEED_PREFIX} Incoming: Power Grid Stability Report - Metro Zone`,
  landslideBrief: `${SEED_PREFIX} Incoming: Landslide Risk Brief - Hill County`,
  publicHealth: `${SEED_PREFIX} Incoming: Public Health Surveillance Summary - Citywide`,
  mobilizationOrder: `${SEED_PREFIX} Outgoing: Resource Mobilization Order - Response Teams`,
  evacuationGuidance: `${SEED_PREFIX} Outgoing: Evacuation Guidance - Zone 4`,
  interagencyBrief: `${SEED_PREFIX} Outgoing: Interagency Briefing Package - Regional`,
  logisticsRequest: `${SEED_PREFIX} Outgoing: Logistics Request - Medical Supplies`,
  situationReport: `${SEED_PREFIX} Outgoing: Situation Report - Executive Summary`,
  afterAction: `${SEED_PREFIX} Internal: After-Action Review Prep - Storm Event`,
  shiftHandover: `${SEED_PREFIX} Internal: Operations Shift Handover Notes`,
  analyticsUpdate: `${SEED_PREFIX} Internal: Analytics Model Update - Flood Forecast`,
  riskRegister: `${SEED_PREFIX} Internal: Risk Register Update - Q1`,
  trainingSchedule: `${SEED_PREFIX} Internal: Training Schedule - EOC Drill`,
};

type SeedSummary = {
  documents: { created: number; skipped: number };
  routes: { created: number; skipped: number; updated: number };
  stages: { created: number; updated: number };
  tasks: { created: number; updated: number };
  taskLinks: { created: number; skipped: number };
  incidents: { created: number; updated: number; skipped: number };
};

type ScenarioSeedContext = {
  departments: {
    operations: Department;
    emergency: Department;
    analytics: Department;
    divisionNorth: Department;
    divisionSouth: Department;
    rapidResponse: Department;
    logistics: Department;
    generalOffice: Department;
  };
  users: {
    chairperson: User;
    firstDeputy: User;
    deputy: User;
    opsHead: User;
    emergencyHead: User;
    divisionNorthHead: User;
    divisionSouthHead: User;
    employeeNorth: User;
    employeeSouth: User;
    employeeRapid: User;
    employeeLogistics: User;
    analyst: User;
    admin: User;
  };
};

type DocumentSeedSpec = {
  title: string;
  type: EdmDocumentType;
  status: EdmDocumentStatus;
  department: Department;
  creator: User;
  subject: string;
  summary: string;
  resolutionText?: string | null;
  confidentiality?: EdmDocument['confidentiality'];
  createdAt: Date;
  dueAt?: Date | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  archivedAt?: Date | null;
};

type RouteSeedSpec = {
  document: EdmDocument;
  scenario: 'A' | 'B' | 'C';
  progress: 'in_progress' | 'completed' | 'rejected';
  createdBy: User;
  stages: Array<{
    orderNo: number;
    stageType: EdmRouteStage['stageType'];
    assigneeType: EdmRouteStage['assigneeType'];
    assigneeUser?: User | null;
    assigneeRole?: string | null;
    assigneeDepartment?: Department | null;
  }>;
};

type RouteSeedResult = {
  route: EdmDocumentRoute;
  document: EdmDocument;
  progress: RouteSeedSpec['progress'];
};

type TaskSeedSpec = {
  title: string;
  description: string;
  status: TaskStatus;
  creator: User;
  receiver: User;
  createdAt: Date;
  linkedDocumentTitle?: string;
};

type SeededTaskLink = {
  task: Task;
  linkedDocumentTitle?: string;
};

@Injectable()
export class ScenarioSeed {
  private readonly logger = new Logger(ScenarioSeed.name);

  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const mode = process.env.IAM_SEED_MODE ?? 'enterprise';
    if (mode !== 'scenario') {
      this.logger.log(
        `Scenario seed skipped. IAM_SEED_MODE=${mode} (expected scenario).`,
      );
      return;
    }

    const summary: SeedSummary = {
      documents: { created: 0, skipped: 0 },
      routes: { created: 0, skipped: 0, updated: 0 },
      stages: { created: 0, updated: 0 },
      tasks: { created: 0, updated: 0 },
      taskLinks: { created: 0, skipped: 0 },
      incidents: { created: 0, updated: 0, skipped: 0 },
    };

    await this.dataSource.transaction(async (manager) => {
      const context = await this.loadContext(manager);
      if (!context) {
        return;
      }

      const documents = await this.seedDocuments(manager, context, summary);
      const routes = await this.seedRoutes(manager, context, documents, summary);
      await this.simulateRouteProgress(manager, routes, summary);

      const tasks = await this.seedTasks(manager, context, summary);
      await this.linkTasksToDocuments(
        manager,
        tasks,
        documents,
        context,
        summary,
      );

      await this.seedIncidents(manager, context, summary);
    });

    this.logger.log(
      `Scenario seed completed. Documents: +${summary.documents.created}/~${summary.documents.skipped}, ` +
        `Routes: +${summary.routes.created}/~${summary.routes.updated}/=${summary.routes.skipped}, ` +
        `Stages: +${summary.stages.created}/~${summary.stages.updated}, ` +
        `Tasks: +${summary.tasks.created}/~${summary.tasks.updated}, ` +
        `TaskLinks: +${summary.taskLinks.created}/=${summary.taskLinks.skipped}, ` +
        `Incidents: +${summary.incidents.created}/~${summary.incidents.updated}/=${summary.incidents.skipped}.`,
    );
  }

  private async loadContext(
    manager: EntityManager,
  ): Promise<ScenarioSeedContext | null> {
    const departmentRepo = manager.getRepository(Department);
    const userRepo = manager.getRepository(User);

    const departmentNames = [
      'Operations Department',
      'Emergency Response Department',
      'Analytics Department',
      'Division North',
      'Division South',
      'Rapid Response Unit',
      'Logistics Unit',
      'General Office',
    ];

    const departments = await departmentRepo.find({
      where: { name: In(departmentNames) },
    });

    const departmentMap = new Map(
      departments.map((department) => [department.name, department]),
    );

    const users = await userRepo.find({
      where: {
        email: In([
          'chairperson@coescd.local',
          'first.deputy@coescd.local',
          'deputy@coescd.local',
          'ops.head@coescd.local',
          'emergency.head@coescd.local',
          'division.north.head@coescd.local',
          'division.south.head@coescd.local',
          'employee.north1@coescd.local',
          'employee.south1@coescd.local',
          'employee.rapid@coescd.local',
          'employee.logistics@coescd.local',
          'analyst@coescd.local',
          'admin@coescd.local',
        ]),
      },
      relations: { department: true },
    });

    const userMap = new Map(users.map((user) => [user.email, user]));

    const missingDepartments = departmentNames.filter(
      (name) => !departmentMap.get(name),
    );
    const missingUsers = [
      'chairperson@coescd.local',
      'first.deputy@coescd.local',
      'deputy@coescd.local',
      'ops.head@coescd.local',
      'emergency.head@coescd.local',
      'division.north.head@coescd.local',
      'division.south.head@coescd.local',
      'employee.north1@coescd.local',
      'employee.south1@coescd.local',
      'employee.rapid@coescd.local',
      'employee.logistics@coescd.local',
      'analyst@coescd.local',
      'admin@coescd.local',
    ].filter((email) => !userMap.get(email));

    if (missingDepartments.length || missingUsers.length) {
      if (missingDepartments.length) {
        this.logger.error(
          `Scenario seed missing departments: ${missingDepartments.join(', ')}`,
        );
      }
      if (missingUsers.length) {
        this.logger.error(
          `Scenario seed missing users: ${missingUsers.join(', ')}`,
        );
      }
      return null;
    }

    return {
      departments: {
        operations: departmentMap.get('Operations Department') as Department,
        emergency: departmentMap.get('Emergency Response Department') as Department,
        analytics: departmentMap.get('Analytics Department') as Department,
        divisionNorth: departmentMap.get('Division North') as Department,
        divisionSouth: departmentMap.get('Division South') as Department,
        rapidResponse: departmentMap.get('Rapid Response Unit') as Department,
        logistics: departmentMap.get('Logistics Unit') as Department,
        generalOffice: departmentMap.get('General Office') as Department,
      },
      users: {
        chairperson: userMap.get('chairperson@coescd.local') as User,
        firstDeputy: userMap.get('first.deputy@coescd.local') as User,
        deputy: userMap.get('deputy@coescd.local') as User,
        opsHead: userMap.get('ops.head@coescd.local') as User,
        emergencyHead: userMap.get('emergency.head@coescd.local') as User,
        divisionNorthHead: userMap.get('division.north.head@coescd.local') as User,
        divisionSouthHead: userMap.get('division.south.head@coescd.local') as User,
        employeeNorth: userMap.get('employee.north1@coescd.local') as User,
        employeeSouth: userMap.get('employee.south1@coescd.local') as User,
        employeeRapid: userMap.get('employee.rapid@coescd.local') as User,
        employeeLogistics: userMap.get('employee.logistics@coescd.local') as User,
        analyst: userMap.get('analyst@coescd.local') as User,
        admin: userMap.get('admin@coescd.local') as User,
      },
    };
  }

  private async seedDocuments(
    manager: EntityManager,
    context: ScenarioSeedContext,
    summary: SeedSummary,
  ): Promise<EdmDocument[]> {
    const documentRepo = manager.getRepository(EdmDocument);
    const now = new Date();

    const docs: DocumentSeedSpec[] = [
      {
        title: DOC_TITLES.floodRisk,
        type: 'incoming',
        status: 'in_route',
        department: context.departments.operations,
        creator: context.users.opsHead,
        subject: 'Hydrology office raised risk level to moderate-high.',
        summary: 'Requires immediate mitigation review for northern levees.',
        confidentiality: 'department_confidential',
        createdAt: this.shiftDate(now, -30, 2),
        dueAt: this.shiftDate(now, -5, 0),
      },
      {
        title: DOC_TITLES.portClosure,
        type: 'incoming',
        status: 'draft',
        department: context.departments.operations,
        creator: context.users.opsHead,
        subject: 'Port authority requests coordinated response plan.',
        summary: 'Drafting interagency resource sharing plan for closure window.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -7, 4),
      },
      {
        title: DOC_TITLES.severeWeather,
        type: 'incoming',
        status: 'approved',
        department: context.departments.operations,
        creator: context.users.opsHead,
        subject: 'Meteorological service issued 72h severe weather advisory.',
        summary: 'Approved escalation protocol for coastal belt coverage.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -21, 1),
        approvedAt: this.shiftDate(now, -18, 6),
        dueAt: this.shiftDate(now, -16, 2),
      },
      {
        title: DOC_TITLES.hospitalCapacity,
        type: 'incoming',
        status: 'in_route',
        department: context.departments.emergency,
        creator: context.users.emergencyHead,
        subject: 'Regional hospitals at 92% surge capacity.',
        summary: 'Requesting mobile triage units and staffing surge.',
        confidentiality: 'restricted',
        createdAt: this.shiftDate(now, -14, 3),
        dueAt: this.shiftDate(now, -2, 3),
      },
      {
        title: DOC_TITLES.wildfireUpdate,
        type: 'incoming',
        status: 'in_route',
        department: context.departments.emergency,
        creator: context.users.emergencyHead,
        subject: 'Fire line expanded by 12km overnight.',
        summary: 'Mutual aid crews requested; air support staging needed.',
        confidentiality: 'department_confidential',
        createdAt: this.shiftDate(now, -10, 5),
        dueAt: this.shiftDate(now, -1, 2),
      },
      {
        title: DOC_TITLES.supplyChain,
        type: 'incoming',
        status: 'returned_for_revision',
        department: context.departments.analytics,
        creator: context.users.analyst,
        subject: 'Critical supplies delayed beyond 48 hours.',
        summary: 'Revisions required for alternative sourcing options.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -6, 2),
        dueAt: this.shiftDate(now, 5, 0),
      },
      {
        title: DOC_TITLES.waterAlert,
        type: 'incoming',
        status: 'rejected',
        department: context.departments.analytics,
        creator: context.users.analyst,
        subject: 'Water contamination alert pending verification.',
        summary: 'Rejected due to insufficient lab validation data.',
        confidentiality: 'restricted',
        createdAt: this.shiftDate(now, -18, 4),
        rejectedAt: this.shiftDate(now, -16, 2),
      },
      {
        title: DOC_TITLES.gridStability,
        type: 'incoming',
        status: 'returned_for_revision',
        department: context.departments.operations,
        creator: context.users.opsHead,
        subject: 'Grid stability trending below threshold.',
        summary: 'Requesting engineering review on load shedding plan.',
        confidentiality: 'department_confidential',
        createdAt: this.shiftDate(now, -9, 3),
        dueAt: this.shiftDate(now, 7, 0),
      },
      {
        title: DOC_TITLES.landslideBrief,
        type: 'incoming',
        status: 'archived',
        department: context.departments.emergency,
        creator: context.users.emergencyHead,
        subject: 'Historical landslide activity catalog.',
        summary: 'Archived reference for hillside risk modeling.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -28, 6),
        archivedAt: this.shiftDate(now, -20, 2),
      },
      {
        title: DOC_TITLES.publicHealth,
        type: 'incoming',
        status: 'approved',
        department: context.departments.analytics,
        creator: context.users.analyst,
        subject: 'Citywide surveillance summary for respiratory illness.',
        summary: 'Approved data summary for executive briefing.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -7, 6),
        approvedAt: this.shiftDate(now, -6, 2),
      },
      {
        title: DOC_TITLES.mobilizationOrder,
        type: 'outgoing',
        status: 'in_route',
        department: context.departments.operations,
        creator: context.users.opsHead,
        subject: 'Mobilize response teams across northern sector.',
        summary: 'Awaiting clearance for resource mobilization.',
        confidentiality: 'department_confidential',
        createdAt: this.shiftDate(now, -5, 3),
        dueAt: this.shiftDate(now, -1, 4),
      },
      {
        title: DOC_TITLES.evacuationGuidance,
        type: 'outgoing',
        status: 'draft',
        department: context.departments.emergency,
        creator: context.users.emergencyHead,
        subject: 'Evacuation guidance for Zone 4 drafted for review.',
        summary: 'Pending alignment with shelter capacity updates.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -3, 4),
      },
      {
        title: DOC_TITLES.interagencyBrief,
        type: 'outgoing',
        status: 'approved',
        department: context.departments.analytics,
        creator: context.users.analyst,
        subject: 'Interagency briefing for regional incident.',
        summary: 'Approved package for external partners.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -4, 2),
        approvedAt: this.shiftDate(now, -2, 1),
      },
      {
        title: DOC_TITLES.logisticsRequest,
        type: 'outgoing',
        status: 'rejected',
        department: context.departments.operations,
        creator: context.users.opsHead,
        subject: 'Requested medical supplies exceeded approved allocation.',
        summary: 'Rejected for revision to match inventory constraints.',
        confidentiality: 'department_confidential',
        createdAt: this.shiftDate(now, -2, 5),
        rejectedAt: this.shiftDate(now, -1, 2),
      },
      {
        title: DOC_TITLES.situationReport,
        type: 'outgoing',
        status: 'returned_for_revision',
        department: context.departments.emergency,
        creator: context.users.emergencyHead,
        subject: 'Daily situation report needs updated casualty figures.',
        summary: 'Returned for revision pending field verification.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -1, 4),
        dueAt: this.shiftDate(now, 4, 0),
      },
      {
        title: DOC_TITLES.afterAction,
        type: 'internal',
        status: 'approved',
        department: context.departments.emergency,
        creator: context.users.emergencyHead,
        subject: 'After-action review preparation plan.',
        summary: 'Approved for cross-team debrief schedule.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, 0, -2),
        approvedAt: this.shiftDate(now, 0, -1),
      },
      {
        title: DOC_TITLES.shiftHandover,
        type: 'internal',
        status: 'in_route',
        department: context.departments.analytics,
        creator: context.users.analyst,
        subject: 'Shift handover notes for analytics desk.',
        summary: 'Draft awaiting team lead inputs.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, 0, 1),
        dueAt: this.shiftDate(now, -1, 0),
      },
      {
        title: DOC_TITLES.analyticsUpdate,
        type: 'internal',
        status: 'draft',
        department: context.departments.analytics,
        creator: context.users.analyst,
        subject: 'Flood forecast model coefficients updated.',
        summary: 'Draft for QA before deployment.',
        confidentiality: 'department_confidential',
        createdAt: this.shiftDate(now, 0, 3),
      },
      {
        title: DOC_TITLES.riskRegister,
        type: 'internal',
        status: 'in_route',
        department: context.departments.operations,
        creator: context.users.opsHead,
        subject: 'Quarterly risk register updates for operations.',
        summary: 'In route for department head approval.',
        confidentiality: 'department_confidential',
        createdAt: this.shiftDate(now, -7, 3),
        dueAt: this.shiftDate(now, 6, 0),
      },
      {
        title: DOC_TITLES.trainingSchedule,
        type: 'internal',
        status: 'archived',
        department: context.departments.emergency,
        creator: context.users.emergencyHead,
        subject: 'Archived training schedule for EOC drill.',
        summary: 'Reference-only; superseded by updated training plan.',
        confidentiality: 'public_internal',
        createdAt: this.shiftDate(now, -30, 5),
        archivedAt: this.shiftDate(now, -24, 2),
      },
    ];

    const createdDocuments: EdmDocument[] = [];

    for (const spec of docs) {
      const existing = await documentRepo.findOne({
        where: { title: spec.title },
        relations: { department: true, creator: true, currentRoute: true },
      });

      if (existing) {
        summary.documents.skipped += 1;
        createdDocuments.push(existing);
        continue;
      }

      const document = documentRepo.create({
        title: spec.title,
        type: spec.type,
        status: spec.status,
        department: spec.department,
        creator: spec.creator,
        subject: spec.subject,
        summary: spec.summary,
        resolutionText: spec.resolutionText ?? null,
        confidentiality: spec.confidentiality ?? 'public_internal',
        createdAt: spec.createdAt,
        updatedAt: spec.createdAt,
        dueAt: spec.dueAt ?? null,
        approvedAt: spec.approvedAt ?? null,
        rejectedAt: spec.rejectedAt ?? null,
        archivedAt: spec.archivedAt ?? null,
        deletedAt: null,
      });

      const saved = await documentRepo.save(document);
      createdDocuments.push(saved);
      summary.documents.created += 1;
    }

    return createdDocuments;
  }

  private async seedRoutes(
    manager: EntityManager,
    context: ScenarioSeedContext,
    documents: EdmDocument[],
    summary: SeedSummary,
  ): Promise<RouteSeedResult[]> {
    const routeRepo = manager.getRepository(EdmDocumentRoute);
    const stageRepo = manager.getRepository(EdmRouteStage);
    const documentRepo = manager.getRepository(EdmDocument);

    const byTitle = new Map(documents.map((doc) => [doc.title, doc]));

    const routeSpecsBase: RouteSeedSpec[] = [
      {
        document: byTitle.get(DOC_TITLES.floodRisk) as EdmDocument,
        scenario: 'A',
        progress: 'in_progress',
        createdBy: context.users.chairperson,
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUser: context.users.chairperson,
          },
          {
            orderNo: 2,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUser: context.users.deputy,
          },
          {
            orderNo: 3,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUser: context.users.opsHead,
          },
          {
            orderNo: 4,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUser: context.users.divisionNorthHead,
          },
          {
            orderNo: 5,
            stageType: 'sign',
            assigneeType: 'user',
            assigneeUser: context.users.employeeNorth,
          },
        ],
      },
      {
        document: byTitle.get(DOC_TITLES.severeWeather) as EdmDocument,
        scenario: 'A',
        progress: 'completed',
        createdBy: context.users.chairperson,
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUser: context.users.chairperson,
          },
          {
            orderNo: 2,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUser: context.users.deputy,
          },
          {
            orderNo: 3,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUser: context.users.opsHead,
          },
          {
            orderNo: 4,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUser: context.users.divisionNorthHead,
          },
          {
            orderNo: 5,
            stageType: 'sign',
            assigneeType: 'user',
            assigneeUser: context.users.employeeNorth,
          },
        ],
      },
      {
        document: byTitle.get(DOC_TITLES.mobilizationOrder) as EdmDocument,
        scenario: 'B',
        progress: 'in_progress',
        createdBy: context.users.firstDeputy,
        stages: [
          {
            orderNo: 1,
            stageType: 'review',
            assigneeType: 'role',
            assigneeRole: 'chancellery',
            assigneeDepartment: context.departments.generalOffice,
          },
          {
            orderNo: 2,
            stageType: 'approve',
            assigneeType: 'user',
            assigneeUser: context.users.opsHead,
          },
          {
            orderNo: 3,
            stageType: 'review',
            assigneeType: 'user',
            assigneeUser: context.users.divisionSouthHead,
          },
        ],
      },
      {
        document: byTitle.get(DOC_TITLES.riskRegister) as EdmDocument,
        scenario: 'C',
        progress: 'in_progress',
        createdBy: context.users.opsHead,
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'department_head',
            assigneeDepartment: context.departments.operations,
          },
        ],
      },
      {
        document: byTitle.get(DOC_TITLES.logisticsRequest) as EdmDocument,
        scenario: 'C',
        progress: 'rejected',
        createdBy: context.users.opsHead,
        stages: [
          {
            orderNo: 1,
            stageType: 'approve',
            assigneeType: 'department_head',
            assigneeDepartment: context.departments.operations,
          },
        ],
      },
    ];
    const routeSpecs = routeSpecsBase.filter((spec) => spec.document);

    const results: RouteSeedResult[] = [];

    for (const spec of routeSpecs) {
      const existing = await routeRepo.findOne({
        where: {
          document: { id: spec.document.id },
          overrideReason: SEED_ROUTE_REASON,
        },
        relations: { stages: true, document: true },
      });

      if (existing) {
        summary.routes.skipped += 1;
        results.push({ route: existing, document: spec.document, progress: spec.progress });
        continue;
      }

      const route = routeRepo.create({
        document: spec.document,
        versionNo: 1,
        state: 'active',
        completionPolicy: 'sequential',
        startedAt: this.shiftDate(new Date(), -2, 1),
        finishedAt: null,
        createdBy: spec.createdBy,
        overrideReason: SEED_ROUTE_REASON,
      });

      const savedRoute = await routeRepo.save(route);
      summary.routes.created += 1;

      const stages = await stageRepo.save(
        spec.stages.map((stage) =>
          stageRepo.create({
            route: savedRoute,
            orderNo: stage.orderNo,
            stageGroupNo: null,
            stageType: stage.stageType,
            assigneeType: stage.assigneeType,
            assigneeUser: stage.assigneeUser ?? null,
            assigneeRole: stage.assigneeRole ?? null,
            assigneeDepartment: stage.assigneeDepartment ?? null,
            state: 'pending',
            dueAt: null,
            startedAt: null,
            completedAt: null,
            escalationPolicy: null,
          }),
        ),
      );

      summary.stages.created += stages.length;

      spec.document.currentRoute = savedRoute;
      await documentRepo.save(spec.document);

      results.push({ route: savedRoute, document: spec.document, progress: spec.progress });
    }

    return results;
  }

  private async simulateRouteProgress(
    manager: EntityManager,
    routes: RouteSeedResult[],
    summary: SeedSummary,
  ): Promise<void> {
    if (!routes.length) {
      return;
    }

    const routeRepo = manager.getRepository(EdmDocumentRoute);
    const stageRepo = manager.getRepository(EdmRouteStage);
    const documentRepo = manager.getRepository(EdmDocument);

    const now = new Date();

    for (const seedRoute of routes) {
      const route = await routeRepo.findOne({
        where: { id: seedRoute.route.id },
        relations: { stages: true, document: true },
      });
      if (!route) {
        continue;
      }

      const orderedStages = [...route.stages].sort(
        (a, b) => a.orderNo - b.orderNo,
      );

      if (!orderedStages.length) {
        continue;
      }

      const routeStartedAt = route.startedAt ?? this.shiftDate(now, -3, 2);
      route.startedAt = routeStartedAt;

      if (seedRoute.progress === 'completed') {
        route.state = 'completed';
        route.finishedAt = this.shiftDate(now, -1, 2);

        for (const stage of orderedStages) {
          stage.state = 'approved';
          stage.startedAt = routeStartedAt;
          stage.completedAt = this.shiftDate(routeStartedAt, 0, 2);
        }

        route.document.status = 'approved';
        route.document.approvedAt = route.finishedAt;
      } else if (seedRoute.progress === 'rejected') {
        route.state = 'rejected';
        route.finishedAt = this.shiftDate(now, -1, 1);

        for (const [index, stage] of orderedStages.entries()) {
          if (index === 0) {
            stage.state = 'rejected';
            stage.startedAt = routeStartedAt;
            stage.completedAt = route.finishedAt;
          } else {
            stage.state = 'pending';
            stage.startedAt = null;
            stage.completedAt = null;
          }
        }

        route.document.status = 'rejected';
        route.document.rejectedAt = route.finishedAt;
      } else {
        route.state = 'active';
        route.finishedAt = null;

        orderedStages.forEach((stage, index) => {
          if (index === 0) {
            stage.state = 'approved';
            stage.startedAt = routeStartedAt;
            stage.completedAt = this.shiftDate(routeStartedAt, 0, 1);
          } else if (index === 1) {
            stage.state = 'in_progress';
            stage.startedAt = this.shiftDate(routeStartedAt, 0, 2);
            stage.completedAt = null;
          } else {
            stage.state = 'pending';
            stage.startedAt = null;
            stage.completedAt = null;
          }
        });

        const currentStage = orderedStages[1] ?? orderedStages[0];
        if (currentStage) {
          currentStage.dueAt = this.shiftDate(now, -1, 0);
        }

        route.document.status = 'in_route';
      }

      await stageRepo.save(orderedStages);
      summary.stages.updated += orderedStages.length;

      await documentRepo.save(route.document);
      await routeRepo.save(route);
      summary.routes.updated += 1;
    }
  }

  private async seedTasks(
    manager: EntityManager,
    context: ScenarioSeedContext,
    summary: SeedSummary,
  ): Promise<SeededTaskLink[]> {
    const taskRepo = manager.getRepository(Task);
    const now = new Date();

    const tasks: TaskSeedSpec[] = [
      {
        title: `${SEED_PREFIX} Task: Assess flood barriers - North Delta`,
        description:
          'Validate current barrier status and report immediate risks. Due: ' +
          this.formatDate(this.shiftDate(now, -2, 0)),
        status: 'in_progress',
        creator: context.users.divisionNorthHead,
        receiver: context.users.employeeNorth,
        createdAt: this.shiftDate(now, -5, 2),
        linkedDocumentTitle: DOC_TITLES.floodRisk,
      },
      {
        title: `${SEED_PREFIX} Task: Coordinate port closure checklist`,
        description: 'Draft closure checklist and confirm agency contacts.',
        status: 'new',
        creator: context.users.opsHead,
        receiver: context.users.divisionSouthHead,
        createdAt: this.shiftDate(now, -6, 1),
        linkedDocumentTitle: DOC_TITLES.portClosure,
      },
      {
        title: `${SEED_PREFIX} Task: Validate advisory distribution list`,
        description: 'Confirm distribution list for severe weather advisory.',
        status: 'completed',
        creator: context.users.opsHead,
        receiver: context.users.divisionNorthHead,
        createdAt: this.shiftDate(now, -18, 3),
        linkedDocumentTitle: DOC_TITLES.severeWeather,
      },
      {
        title: `${SEED_PREFIX} Task: Hospital surge staffing plan`,
        description:
          'Compile staffing surge plan for central region. Due: ' +
          this.formatDate(this.shiftDate(now, -1, 0)),
        status: 'in_progress',
        creator: context.users.employeeRapid,
        receiver: context.users.employeeRapid,
        createdAt: this.shiftDate(now, -3, 5),
        linkedDocumentTitle: DOC_TITLES.hospitalCapacity,
      },
      {
        title: `${SEED_PREFIX} Task: Wildfire perimeter update`,
        description: 'Update perimeter map and satellite annotations.',
        status: 'new',
        creator: context.users.employeeLogistics,
        receiver: context.users.employeeLogistics,
        createdAt: this.shiftDate(now, -2, 3),
        linkedDocumentTitle: DOC_TITLES.wildfireUpdate,
      },
      {
        title: `${SEED_PREFIX} Task: Supply chain mitigation options`,
        description: 'Draft alternative suppliers list for critical items.',
        status: 'completed',
        creator: context.users.analyst,
        receiver: context.users.analyst,
        createdAt: this.shiftDate(now, -4, 2),
        linkedDocumentTitle: DOC_TITLES.supplyChain,
      },
      {
        title: `${SEED_PREFIX} Task: Water alert verification`,
        description: 'Cross-check lab samples with field reports.',
        status: 'completed',
        creator: context.users.analyst,
        receiver: context.users.analyst,
        createdAt: this.shiftDate(now, -12, 2),
        linkedDocumentTitle: DOC_TITLES.waterAlert,
      },
      {
        title: `${SEED_PREFIX} Task: Grid stability analysis`,
        description: 'Review grid metrics and propose stabilization steps.',
        status: 'new',
        creator: context.users.opsHead,
        receiver: context.users.divisionSouthHead,
        createdAt: this.shiftDate(now, -8, 4),
        linkedDocumentTitle: DOC_TITLES.gridStability,
      },
      {
        title: `${SEED_PREFIX} Task: Mobilization roster confirmation`,
        description:
          'Confirm roster and availability for response teams. Due: ' +
          this.formatDate(this.shiftDate(now, -1, 0)),
        status: 'in_progress',
        creator: context.users.divisionSouthHead,
        receiver: context.users.employeeSouth,
        createdAt: this.shiftDate(now, -2, 2),
        linkedDocumentTitle: DOC_TITLES.mobilizationOrder,
      },
      {
        title: `${SEED_PREFIX} Task: Evacuation guidance fact check`,
        description: 'Verify shelter capacity and route status.',
        status: 'completed',
        creator: context.users.employeeRapid,
        receiver: context.users.employeeRapid,
        createdAt: this.shiftDate(now, -1, 3),
        linkedDocumentTitle: DOC_TITLES.evacuationGuidance,
      },
      {
        title: `${SEED_PREFIX} Task: Interagency briefing QA`,
        description: 'Quality review of briefing pack before release.',
        status: 'new',
        creator: context.users.analyst,
        receiver: context.users.analyst,
        createdAt: this.shiftDate(now, -2, 1),
      },
      {
        title: `${SEED_PREFIX} Task: Logistics request revision`,
        description:
          'Revise quantities to align with inventory. Due: ' +
          this.formatDate(this.shiftDate(now, -1, 0)),
        status: 'in_progress',
        creator: context.users.opsHead,
        receiver: context.users.divisionSouthHead,
        createdAt: this.shiftDate(now, -1, 4),
      },
      {
        title: `${SEED_PREFIX} Task: After-action facilitation plan`,
        description: 'Outline facilitation plan and assign note takers.',
        status: 'new',
        creator: context.users.employeeLogistics,
        receiver: context.users.employeeLogistics,
        createdAt: this.shiftDate(now, 0, -1),
      },
      {
        title: `${SEED_PREFIX} Task: Analytics model release checklist`,
        description: 'Prepare checklist for model release and monitoring.',
        status: 'new',
        creator: context.users.analyst,
        receiver: context.users.analyst,
        createdAt: this.shiftDate(now, 0, 1),
      },
      {
        title: `${SEED_PREFIX} Task: Risk register sign-off prep`,
        description: 'Compile risk register changes for sign-off.',
        status: 'in_progress',
        creator: context.users.opsHead,
        receiver: context.users.divisionNorthHead,
        createdAt: this.shiftDate(now, -3, 2),
        linkedDocumentTitle: DOC_TITLES.riskRegister,
      },
    ];

    const seededTasks: SeededTaskLink[] = [];

    for (const spec of tasks) {
      const existing = await taskRepo.findOne({
        where: { title: spec.title },
        relations: { creator: true, receiver: true },
      });

      if (existing) {
        existing.description = spec.description;
        existing.status = spec.status;
        existing.creator = spec.creator;
        existing.receiver = spec.receiver;
        await taskRepo.save(existing);
        summary.tasks.updated += 1;
        seededTasks.push({
          task: existing,
          linkedDocumentTitle: spec.linkedDocumentTitle,
        });
        continue;
      }

      const task = taskRepo.create({
        title: spec.title,
        description: spec.description,
        status: spec.status,
        creator: spec.creator,
        receiver: spec.receiver,
        createdAt: spec.createdAt,
        updatedAt: spec.createdAt,
      });

      const saved = await taskRepo.save(task);
      summary.tasks.created += 1;
      seededTasks.push({
        task: saved,
        linkedDocumentTitle: spec.linkedDocumentTitle,
      });
    }

    return seededTasks;
  }

  private async linkTasksToDocuments(
    manager: EntityManager,
    tasks: SeededTaskLink[],
    documents: EdmDocument[],
    context: ScenarioSeedContext,
    summary: SeedSummary,
  ): Promise<void> {
    if (!tasks.length || !documents.length) {
      return;
    }

    const linkRepo = manager.getRepository(EdmDocumentTaskLink);
    const documentByTitle = new Map(documents.map((doc) => [doc.title, doc]));

    for (const seeded of tasks) {
      if (!seeded.task.title.startsWith(SEED_PREFIX)) {
        continue;
      }

      if (!seeded.linkedDocumentTitle) {
        continue;
      }

      const document = documentByTitle.get(seeded.linkedDocumentTitle);
      if (!document) {
        this.logger.warn(
          `Scenario seed task references missing document: ${seeded.linkedDocumentTitle}`,
        );
        continue;
      }

      const task = seeded.task;
      const existing = await linkRepo.findOne({
        where: { task: { id: task.id }, document: { id: document.id } },
        relations: { task: true, document: true },
      });

      if (existing) {
        summary.taskLinks.skipped += 1;
        continue;
      }

      await linkRepo.save(
        linkRepo.create({
          document,
          task,
          createdBy: task.creator,
        }),
      );
      summary.taskLinks.created += 1;
    }
  }

  private async seedIncidents(
    manager: EntityManager,
    context: ScenarioSeedContext,
    summary: SeedSummary,
  ): Promise<void> {
    if (!this.dataSource.hasMetadata(Disaster)) {
      this.logger.warn('Disaster entity metadata not found. Skipping incidents.');
      return;
    }

    const disasterRepo = manager.getRepository(Disaster);
    const typeRepo = manager.getRepository(DisasterType);
    const categoryRepo = manager.getRepository(DisasterCategory);

    let category = await categoryRepo.findOne({
      where: { name: `${SEED_PREFIX} Natural Hazards` },
    });
    if (!category) {
      category = await categoryRepo.save(
        categoryRepo.create({ name: `${SEED_PREFIX} Natural Hazards` }),
      );
    }

    let wildfireType = await typeRepo.findOne({
      where: { name: `${SEED_PREFIX} Wildfire` },
      relations: { category: true },
    });

    if (!wildfireType) {
      wildfireType = await typeRepo.save(
        typeRepo.create({
          name: `${SEED_PREFIX} Wildfire`,
          category,
        }),
      );
    }

    const incidents = [
      {
        title: `${SEED_PREFIX} Incident: Coastal Storm Surge`,
        description: 'Storm surge affecting coastal infrastructure.',
        location: 'Coastal Belt',
        latitude: 36.85,
        longitude: -75.97,
        severity: 'high' as const,
        status: 'active' as const,
        department: context.departments.emergency,
      },
      {
        title: `${SEED_PREFIX} Incident: Wildfire Expansion - Pine Ridge`,
        description: 'Wildfire expansion into northern ridgeline.',
        location: 'Pine Ridge',
        latitude: 39.75,
        longitude: -105.0,
        severity: 'critical' as const,
        status: 'active' as const,
        department: context.departments.emergency,
      },
      {
        title: `${SEED_PREFIX} Incident: Floodplain Overflow - North Delta`,
        description: 'Floodplain overflow caused localized evacuations.',
        location: 'North Delta',
        latitude: 34.05,
        longitude: -91.1,
        severity: 'high' as const,
        status: 'resolved' as const,
        department: context.departments.operations,
      },
      {
        title: `${SEED_PREFIX} Incident: Heatwave Impact - Metro Zone`,
        description: 'Extended heatwave impacts on critical services.',
        location: 'Metro Zone',
        latitude: 33.75,
        longitude: -84.39,
        severity: 'medium' as const,
        status: 'resolved' as const,
        department: context.departments.analytics,
      },
      {
        title: `${SEED_PREFIX} Incident: Landslide Response - Hill County`,
        description: 'Landslide cleared; monitoring residual risk.',
        location: 'Hill County',
        latitude: 37.2,
        longitude: -119.7,
        severity: 'medium' as const,
        status: 'resolved' as const,
        department: context.departments.operations,
      },
    ];

    for (const incident of incidents) {
      const existing = await disasterRepo.findOne({
        where: { title: incident.title },
        relations: { department: true, type: true },
      });

      if (existing) {
        existing.description = incident.description;
        existing.location = incident.location;
        existing.latitude = incident.latitude;
        existing.longitude = incident.longitude;
        existing.severity = incident.severity;
        existing.status = incident.status;
        existing.department = incident.department;
        existing.type = wildfireType;
        await disasterRepo.save(existing);
        summary.incidents.updated += 1;
        continue;
      }

      await disasterRepo.save(
        disasterRepo.create({
          ...incident,
          type: wildfireType,
          casualties: 0,
          affectedPeople: 0,
        }),
      );
      summary.incidents.created += 1;
    }
  }

  private shiftDate(base: Date, daysOffset: number, hoursOffset: number): Date {
    const date = new Date(base);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(date.getHours() + hoursOffset);
    return date;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
