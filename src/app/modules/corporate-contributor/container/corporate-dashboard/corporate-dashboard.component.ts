// Copyright The Linux Foundation and each contributor to CommunityBridge.
// SPDX-License-Identifier: MIT

import { Component, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClaContributorService } from 'src/app/core/services/cla-contributor.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation } from '@angular/common';
import { OrganizationModel, OrganizationListModel } from 'src/app/core/models/organization';
import { StorageService } from 'src/app/shared/services/storage.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  selector: 'app-corporate-dashboard',
  templateUrl: './corporate-dashboard.component.html',
  styleUrls: ['./corporate-dashboard.component.scss']
})
export class CorporateDashboardComponent {
  @ViewChild('dropdown') dropdown: ElementRef;
  selectedCompany: string;
  searchBoxValue: string;
  searchTimeout = null;
  projectId: string;
  userId: string;
  hasShowNoSignedCLAFoundDialog: boolean;
  hasShowContactAdmin: boolean;
  hasShowDropdown: boolean;
  organization = new OrganizationModel();
  organizationList = new OrganizationListModel();
  form: FormGroup;
  noCompanyFound: boolean;

  constructor(
    private route: ActivatedRoute,
    private claContributorService: ClaContributorService,
    private router: Router,
    private modalService: NgbModal,
    private location: PlatformLocation,
    private storageService: StorageService,
    private formBuilder: FormBuilder,
    private alertService: AlertService
  ) {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    this.userId = this.route.snapshot.paramMap.get('userId');
    this.searchBoxValue = '';
    this.noCompanyFound = true;

    this.location.onPopState(() => this.modalService.dismissAll());
  }

  ngOnInit(): void {
    this.selectedCompany = '';
    this.hasShowDropdown = false;
    this.hasShowContactAdmin = true;

    this.form = this.formBuilder.group({
      companyName: ['', Validators.compose([Validators.required, Validators.minLength(3)])],
    });
  }

  onClickProceed(signedCLANotFoundModal,) {
    this.hasShowContactAdmin = true;
    this.getOrganizationInformation(signedCLANotFoundModal)
  }

  onSelectCompany(organization) {
    this.hasShowDropdown = false;
    this.selectedCompany = organization.organization_id;
    this.searchBoxValue = organization.organization_name;
    this.form.controls.companyName.setValue(organization.organization_name);
  }

  getOrganizationInformation(signedCLANotFoundModal) {
    this.claContributorService.getOrganizationDetails(this.selectedCompany).subscribe(
      (response) => {
        this.organization = response;
        this.storageService.setItem('selectedCompany', this.organization);
        this.checkEmployeeeSignature(signedCLANotFoundModal);
      },
      (exception) => {
        this.alertService.error(exception.error.Message);
      }
    );
  }

  checkEmployeeeSignature(signedCLANotFoundModal) {
    this.alertService.clearAlert();
    const data = {
      project_id: this.projectId,
      company_id: this.organization.companyID,
      user_id: this.userId
    };
    this.claContributorService.CheckPreparedEmployeeSignature(data).subscribe(
      (response) => {
        if (response.errors) {
          if (Object.prototype.hasOwnProperty.call(response.errors, 'missing_ccla')) {
            this.openWithDismiss(signedCLANotFoundModal)
          } else if (Object.prototype.hasOwnProperty.call(response.errors, 'ccla_approval_list')) {
            const url = '/corporate-dashboard/request-authorization/' + this.projectId + '/' + this.userId;
            this.router.navigate([url]);
          }
        } else {
          const url = '/corporate-dashboard/request-authorization/' + this.projectId + '/' + this.userId;
          this.router.navigate([url]);
        }
      },
      (exception) => {
        this.claContributorService.handleError(exception);
      }
    );
  }

  onCompanyKeypress(event) {
    this.hasShowDropdown = true;
    this.noCompanyFound = false;

    if (this.form.valid) {
      const value = event.target.value;
      if (this.selectedCompany !== value) {
        this.selectedCompany = '';
      }
      if (this.searchTimeout !== null) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        this.searchOrganization(value);
      }, 300);
    } else {
      this.organizationList.list = [];
      if (this.form.controls.companyName.value === '') {
        this.noCompanyFound = true;
      }
    }
  }

  toggleDropdown() {
    this.hasShowDropdown = !this.hasShowDropdown;
  }


  searchOrganization(searchText: string) {
    this.alertService.clearAlert();
    this.organizationList.list = [];
    this.claContributorService.searchOrganization(searchText).subscribe(
      (response) => {
        this.organizationList = response;
        if (this.organizationList.list.length <= 0) {
          this.noCompanyFound = true;
        }
      },
      (exception) => {
        this.noCompanyFound = true;
        this.claContributorService.handleError(exception);
      }
    );
  }

  onClickBack() {
    this.router.navigate(['/cla/project/' + this.projectId + '/user/' + this.userId]);
  }

  open(content) {
    this.modalService.open(content, {
      centered: true,
      backdrop: 'static'
    });
  }

  openWithDismiss(content) {
    this.modalService.dismissAll();
    this.open(content);
  }

  onClickAddNewCompany(hasShowCompanyDetailDialog, signedCLANotFoundModal, companyDetailModal) {
    if (!hasShowCompanyDetailDialog) {
      this.hasShowContactAdmin = false;
      this.openWithDismiss(signedCLANotFoundModal);
    } else {
      this.openWithDismiss(companyDetailModal);
    }
  }

  onClickClose() {
    this.modalService.dismissAll();
  }

  onClickNoBtn(content) {
    this.modalService.open(content);
  }

  onClickSubmitRequestToAdmin() {

  }

  onClickProceedCLAManagerSetting() {

  }
}
