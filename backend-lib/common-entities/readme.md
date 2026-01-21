Utilisation de la version 0.0.2 du common entities

- Dans le dossier main/resources créer le fichier i18n/<application-name>/messages.properties
- Mettre à jour la version de common-entities (0.0.2-SNAPSHOT) dans le pom.xml
- Dans la classe pricipale de l'application (Main), override le bean suivant en ajoutant le chemin du nouveau fichier créer

  @Bean
  public CustomMessageSource messageSource() {
  CustomMessageSource messageSource
  = new CustomMessageSource();
  messageSource.setBasenames("classpath:i18n/default/messages", "i18n/<application-name>/messages");
  messageSource.setDefaultEncoding("UTF-8");
  messageSource.setUseCodeAsDefaultMessage(true);
  return messageSource;
  }

- créer la classe AdviceController dans le package controller
- Ajouter les annotations suivantes à la classe :
  @ControllerAdvice
  @Priority(1)
  @Order(Ordered.HIGHEST_PRECEDENCE)
  @Slf4j(topic = "EventLog")
- hériter la classe CommonAdviceController de common-entities

